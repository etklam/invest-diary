#!/usr/bin/env tsx
import 'dotenv/config'

import { randomUUID } from 'node:crypto'
import { createRequire } from 'node:module'
import { parseRuntimeSettings } from '../../server/config/env'
import { createPrismaClientOptions } from '../../lib/prisma-client-options'
import { formatErrorContext, logger } from '../../lib/logger'
import { uniqueSymbols } from '../../lib/market-state/seed-universe-utils'
import { getYahooFinanceClient, isYahooRateLimitError } from '../../lib/market-data/daily-prices'
import { normalizeYahooSymbol } from '../../lib/market-data/yahoo'
import { runYahooRequest } from '../../lib/market-data/yahoo-request-queue'
import { mapLimit } from '../map-limit'

const require = createRequire(import.meta.url)
const { PrismaClient } = require('@prisma/client')

const prisma = new PrismaClient(createPrismaClientOptions())

const UNIVERSE_KEY = 'SP500_NDX'
const CONCURRENCY_LIMIT = parseRuntimeSettings().marketDataConcurrency
const JOB_ID = randomUUID()

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

async function fetchUniverseItem(symbol: string): Promise<UniverseSeedItem> {
  const yahooFinance = await getYahooFinanceClient()
  const normalized = normalizeYahooSymbol(symbol)
  const rawQuote = await runYahooRequest(
    `seed:${normalized}`,
    () => yahooFinance.quote(normalized) as Promise<YahooQuoteRaw>,
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
      const errorContext = formatErrorContext(error)
      const context = {
        operation: 'market_state_universe_symbol',
        jobId: JOB_ID,
        symbol,
        progress: `${index + 1}/${symbols.length}`,
        ...errorContext,
      }
      if (isYahooRateLimitError(error)) {
        logger.runtime.warn('MarketState universe Yahoo rate limit', context)
      } else {
        logger.runtime.error('MarketState universe symbol failed', context)
      }
    }
  })

  console.log('MarketState universe 初始化完成')
  console.log(`universeKey：${UNIVERSE_KEY}，成功：${successCount}，失敗：${failedCount}`)
}

main()
  .catch((error) => {
    logger.runtime.error('MarketState universe batch failed', {
      operation: 'market_state_universe',
      jobId: JOB_ID,
      ...formatErrorContext(error),
    })
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
