#!/usr/bin/env tsx
import 'dotenv/config'

import { createRequire } from 'node:module'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { uniqueSymbols } from '../../lib/market-state/seed-universe-utils'
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

interface YahooQuoteRaw {
  symbol?: string
  shortName?: string
  longName?: string
  quoteType?: string
  exchange?: string
  fullExchangeName?: string
}

interface UniverseSeedItem {
  symbol: string
  name: string
  exchange: string
}

interface YahooFinanceClient {
  quote: (symbol: string) => Promise<YahooQuoteRaw>
}

let yahooFinanceClient: YahooFinanceClient | null = null

async function getYahooFinanceClient(): Promise<YahooFinanceClient> {
  if (yahooFinanceClient) return yahooFinanceClient
  const module = await import('yahoo-finance2')
  yahooFinanceClient = new module.default() as unknown as YahooFinanceClient
  return yahooFinanceClient
}

const NASDAQ_100_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'AVGO', 'GOOGL', 'GOOG', 'TSLA', 'COST',
  'NFLX', 'AMD', 'PEP', 'ADBE', 'LIN', 'CSCO', 'TMUS', 'INTU', 'QCOM', 'TXN',
  'AMAT', 'BKNG', 'ISRG', 'AMGN', 'HON', 'CMCSA', 'VRTX', 'MU', 'PANW', 'ADP',
  'LRCX', 'ADI', 'GILD', 'SBUX', 'MELI', 'REGN', 'MDLZ', 'KLAC', 'INTC', 'CRWD',
  'CDNS', 'SNPS', 'PYPL', 'CEG', 'MAR', 'ASML', 'ORLY', 'ABNB', 'FTNT', 'CSX',
  'MRVL', 'NXPI', 'ROP', 'WDAY', 'DASH', 'PCAR', 'MNST', 'ADSK', 'CPRT', 'CHTR',
  'KDP', 'PAYX', 'ROST', 'AEP', 'FAST', 'TEAM', 'KHC', 'DDOG', 'BKR', 'ODFL',
  'CTAS', 'EA', 'EXC', 'VRSK', 'XEL', 'GEHC', 'IDXX', 'AZN', 'TTD', 'ZS',
  'BIIB', 'FANG', 'ON', 'DXCM', 'CDW', 'MDB', 'GFS', 'WBD', 'MCHP', 'ANSS',
  'ILMN', 'ARM', 'CCEP', 'TTWO', 'LULU', 'MRNA', 'WBA', 'SIRI', 'DLTR', 'LCUL',
]

const SP500_LARGE_CAP_SYMBOLS = [
  'AAPL', 'MSFT', 'NVDA', 'AMZN', 'META', 'GOOGL', 'GOOG', 'BRK-B', 'LLY', 'AVGO',
  'JPM', 'TSLA', 'UNH', 'XOM', 'V', 'MA', 'JNJ', 'PG', 'HD', 'COST',
  'ABBV', 'BAC', 'WMT', 'NFLX', 'KO', 'CRM', 'MRK', 'CVX', 'AMD', 'PEP',
  'ORCL', 'TMO', 'ADBE', 'LIN', 'ACN', 'MCD', 'CSCO', 'WFC', 'ABT', 'QCOM',
  'GE', 'DHR', 'IBM', 'TXN', 'AMAT', 'PM', 'VZ', 'CAT', 'NOW', 'INTU',
  'DIS', 'ISRG', 'NEE', 'UBER', 'GS', 'RTX', 'PFE', 'SPGI', 'AMGN', 'CMCSA',
  'T', 'LOW', 'UNP', 'PGR', 'HON', 'BLK', 'BKNG', 'COP', 'SYK', 'LMT',
  'TJX', 'ELV', 'VRTX', 'ETN', 'NKE', 'C', 'MU', 'BSX', 'MDT', 'PANW',
  'ADP', 'CB', 'PLD', 'ADI', 'SCHW', 'MMC', 'GILD', 'UPS', 'LRCX', 'AMT',
  'SBUX', 'KLAC', 'DE', 'REGN', 'MDLZ', 'CI', 'SO', 'BMY', 'FI', 'INTC',
  'MO', 'DUK', 'ICE', 'CL', 'ZTS', 'SHW', 'CME', 'EQIX', 'APH', 'WM',
  'MCO', 'CVS', 'PH', 'PYPL', 'CDNS', 'SNPS', 'AON', 'TDG', 'EOG', 'HCA',
  'GD', 'CMG', 'USB', 'PNC', 'MMM', 'MSI', 'ITW', 'NOC', 'APD', 'EMR',
  'FCX', 'ORLY', 'MAR', 'ROP', 'AJG', 'TGT', 'BDX', 'ECL', 'ADSK', 'CARR',
  'NSC', 'AFL', 'PSA', 'GM', 'FDX', 'HLT', 'SLB', 'PCAR', 'TRV', 'ROST',
  'BK', 'AZO', 'MET', 'O', 'DLR', 'DHI', 'SPG', 'KMB', 'AEP', 'ALL',
]

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

async function fetchUniverseItem(symbol: string): Promise<UniverseSeedItem> {
  const yahooFinance = await getYahooFinanceClient()
  const normalized = normalizeYahooSymbol(symbol)
  const rawQuote = await runYahooRequest(
    `seed:${normalized}`,
    () => yahooFinance.quote(normalized),
  )

  return {
    symbol,
    name: rawQuote.longName ?? rawQuote.shortName ?? symbol,
    exchange: rawQuote.fullExchangeName ?? rawQuote.exchange ?? 'UNKNOWN',
  }
}

async function upsertUniverseItem(item: UniverseSeedItem): Promise<void> {
  await prisma.marketUniverse.upsert({
    where: { symbol: item.symbol },
    update: {
      name: item.name,
      exchange: item.exchange,
      assetType: 'stock',
      isActive: true,
      updatedAt: new Date(),
    },
    create: {
      symbol: item.symbol,
      name: item.name,
      exchange: item.exchange,
      assetType: 'stock',
      isActive: true,
    },
  })
}

async function main() {
  const symbols = uniqueSymbols([...NASDAQ_100_SYMBOLS, ...SP500_LARGE_CAP_SYMBOLS])
  console.log(`開始初始化 MarketState universe：${UNIVERSE_KEY}`)
  console.log(`候選股票數：${symbols.length}，併發：${CONCURRENCY_LIMIT}`)

  let successCount = 0
  let failedCount = 0

  await mapLimit(symbols, CONCURRENCY_LIMIT, async (symbol, index) => {
    try {
      const item = await fetchUniverseItem(symbol)
      await upsertUniverseItem(item)
      successCount += 1
      console.log(`[${index + 1}/${symbols.length}] ${symbol} 已寫入：${item.name} (${item.exchange})`)
    } catch (error) {
      failedCount += 1
      const message = error instanceof Error ? error.message : String(error)
      const lower = message.toLowerCase()
      if (lower.includes('rate') || lower.includes('429') || lower.includes('too many')) {
        console.warn(`[${index + 1}/${symbols.length}] ${symbol} Yahoo rate-limit：${message}`)
      } else {
        console.error(`[${index + 1}/${symbols.length}] ${symbol} 失敗：${message}`)
      }
    }
  })

  console.log('MarketState universe 初始化完成')
  console.log(`universeKey：${UNIVERSE_KEY}，成功：${successCount}，失敗：${failedCount}`)
}

main()
  .catch((error) => {
    console.error('MarketState universe 初始化失敗：', error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
