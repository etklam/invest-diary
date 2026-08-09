#!/usr/bin/env tsx
import 'dotenv/config'

import { createRequire } from 'node:module'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import {
  calculateBreadthRows,
  parseDailyPrices,
  resolveRangeStart,
  toDateKey,
  type BreadthDayResult,
  type DailyPriceInput,
  type YahooChartQuote,
} from '../../lib/market-state/update-breadth-utils'
import { normalizeYahooSymbol } from '../../lib/market-data/yahoo'
import { runYahooRequest } from '../../lib/market-data/yahoo-request-queue'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

function getDatabaseUrl() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL is required')
  return url
}

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(getDatabaseUrl()),
})

const UNIVERSE_KEY = 'SP500_NDX'
const CONCURRENCY_LIMIT = Number(process.env.MARKET_DATA_CONCURRENCY) || 2
const INCREMENTAL_RANGE = '1mo'
const BACKFILL_RANGE = '1y'
const BACKFILL_DAYS = 260
const INCREMENTAL_DAYS = 10

type YahooChartInterval = '1d'

interface YahooFinanceClient {
  chart: (symbol: string, options: Record<string, unknown>) => Promise<{ quotes: unknown[] }>
}

const isBackfill = process.argv.includes('--backfill')
const targetDays = isBackfill ? BACKFILL_DAYS : INCREMENTAL_DAYS
const fetchRange = isBackfill ? BACKFILL_RANGE : INCREMENTAL_RANGE
let yahooFinanceClient: YahooFinanceClient | null = null

async function getYahooFinanceClient(): Promise<YahooFinanceClient> {
  if (yahooFinanceClient) return yahooFinanceClient

  const module = await import('yahoo-finance2')
  yahooFinanceClient = new module.default() as unknown as YahooFinanceClient
  return yahooFinanceClient
}

async function mapLimit<T, R>(
  items: T[],
  limit: number,
  mapper: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex
      nextIndex += 1
      results[index] = await mapper(items[index], index)
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function fetchSymbolPrices(symbol: string): Promise<DailyPriceInput[]> {
  const yahooFinance = await getYahooFinanceClient()
  const normalized = normalizeYahooSymbol(symbol)
  const chart = await runYahooRequest(
    `breadth:${normalized}:${fetchRange}`,
    () => yahooFinance.chart(normalized, {
      period1: resolveRangeStart(fetchRange),
      period2: new Date(),
      interval: '1d' as YahooChartInterval,
      return: 'array',
    }),
  )

  return parseDailyPrices(symbol, chart.quotes as YahooChartQuote[])
}

function isRateLimitError(message: string): boolean {
  const lower = message.toLowerCase()
  return lower.includes('rate') || lower.includes('429') || lower.includes('too many')
}

async function upsertPrices(prices: DailyPriceInput[]): Promise<void> {
  if (prices.length === 0) return
  // Batch insert — skip duplicates (upsert equivalent for initial load)
  // For subsequent daily updates, volume is small enough that skipDuplicates is fine
  try {
    await prisma.marketDailyPrice.createMany({
      data: prices,
      skipDuplicates: true,
    })
  } catch {
    // Fallback: upsert one-by-one only if batch fails (e.g. partial conflict)
    for (const price of prices) {
      await prisma.marketDailyPrice.upsert({
        where: {
          symbol_date: {
            symbol: price.symbol,
            date: price.date,
          },
        },
        update: {
          open: price.open,
          high: price.high,
          low: price.low,
          close: price.close,
          adjustedClose: price.adjustedClose,
          volume: price.volume,
        },
        create: price,
      })
    }
  }
}

async function upsertBreadthRows(rows: BreadthDayResult[]): Promise<void> {
  if (rows.length === 0) return
  try {
    await prisma.marketBreadthDaily.createMany({
      data: rows.map(row => ({
        universeKey: UNIVERSE_KEY,
        ...row,
      })),
      skipDuplicates: true,
    })
  } catch {
    for (const row of rows) {
      await prisma.marketBreadthDaily.upsert({
        where: {
          universeKey_date: {
            universeKey: UNIVERSE_KEY,
            date: row.date,
          },
        },
        update: {
          universeCount: row.universeCount,
          up4Count: row.up4Count,
          down4Count: row.down4Count,
          up4Pct: row.up4Pct,
          down4Pct: row.down4Pct,
          above40dCount: row.above40dCount,
          above40dPct: row.above40dPct,
          ratio5d: row.ratio5d,
          ratio10d: row.ratio10d,
          regime: row.regime,
          score: row.score,
          coveragePct: row.coveragePct,
          isStale: row.isStale,
        },
        create: {
          universeKey: UNIVERSE_KEY,
          ...row,
        },
      })
    }
  }
}

async function main() {
  console.log(`開始更新 MarketState breadth，模式：${isBackfill ? 'Backfill' : '增量'}`)

  const universe = await prisma.marketUniverse.findMany({
    where: {
      isActive: true,
      assetType: 'stock',
    },
    select: { symbol: true },
    orderBy: { symbol: 'asc' },
  })
  const symbols = (universe as Array<{ symbol: string }>).map(item => item.symbol)

  if (symbols.length === 0) {
    console.log('沒有 active universe 股票，先執行 seed-universe.ts，別讓 batch 空轉。')
    return
  }

  console.log(`Universe 股票數：${symbols.length}，抓取最近 ${targetDays} 個交易日左右資料，併發：${CONCURRENCY_LIMIT}`)

  let failedCount = 0
  let fetchedPriceCount = 0
  const fetchedBySymbol = await mapLimit(symbols, CONCURRENCY_LIMIT, async (symbol, index) => {
    try {
      const prices = await fetchSymbolPrices(symbol)
      await upsertPrices(prices)
      fetchedPriceCount += prices.length
      console.log(`[${index + 1}/${symbols.length}] ${symbol} 寫入 ${prices.length} 筆價格`)
      return { symbol, ok: true, prices }
    } catch (error) {
      failedCount += 1
      const message = error instanceof Error ? error.message : String(error)
      if (isRateLimitError(message)) {
        console.warn(`[${index + 1}/${symbols.length}] ${symbol} Yahoo rate-limit：${message}`)
      } else {
        console.error(`[${index + 1}/${symbols.length}] ${symbol} 失敗：${message}`)
      }
      return { symbol, ok: false, prices: [] as DailyPriceInput[] }
    }
  })

  const successfulSymbols = new Set(fetchedBySymbol.filter(result => result.ok).map(result => result.symbol))
  const fetchedDateKeys = new Set(
    fetchedBySymbol
      .flatMap(result => result.prices)
      .map(price => toDateKey(price.date)),
  )
  const datesToCalculate = Array.from(fetchedDateKeys)
    .sort()
    .slice(-targetDays)
    .map(dateKey => new Date(`${dateKey}T00:00:00.000Z`))

  if (datesToCalculate.length === 0) {
    console.log('沒有可計算的價格日期，停止更新 breadth。')
    return
  }

  const earliestTarget = datesToCalculate[0]
  const historyStart = new Date(earliestTarget)
  historyStart.setUTCDate(historyStart.getUTCDate() - 90)

  const dbPrices = await prisma.marketDailyPrice.findMany({
    where: {
      symbol: { in: symbols },
      date: { gte: historyStart },
    },
    select: {
      symbol: true,
      date: true,
      adjustedClose: true,
    },
    orderBy: [
      { symbol: 'asc' },
      { date: 'asc' },
    ],
  })
  const existingBreadthRows = await prisma.marketBreadthDaily.findMany({
    where: {
      universeKey: UNIVERSE_KEY,
      date: { gte: historyStart },
    },
    select: {
      date: true,
      up4Count: true,
      down4Count: true,
    },
    orderBy: { date: 'asc' },
  })

  const pricePoints = dbPrices.map(price => ({
    symbol: price.symbol,
    date: price.date,
    adjustedClose: Number(price.adjustedClose),
  }))
  const existingBreadthHistory = existingBreadthRows.map(row => ({
    date: row.date,
    up4Count: row.up4Count ?? 0,
    down4Count: row.down4Count ?? 0,
  }))
  const breadthRows = calculateBreadthRows(pricePoints, symbols, datesToCalculate, existingBreadthHistory)
  await upsertBreadthRows(breadthRows)

  const latest = breadthRows.length > 0 ? breadthRows[breadthRows.length - 1] : undefined
  console.log('MarketState breadth 更新完成')
  console.log(`成功股票：${successfulSymbols.size}，失敗股票：${failedCount}，價格筆數：${fetchedPriceCount}，breadth 日期數：${breadthRows.length}`)
  if (latest) {
    console.log(
      `最新日期 ${toDateKey(latest.date)}：coverage ${latest.coveragePct.toFixed(2)}%，regime ${latest.regime}，score ${latest.score}，isStale ${latest.isStale ? '是' : '否'}`,
    )
  }
}

main()
  .catch((error) => {
    console.error('MarketState breadth 更新失敗：', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
