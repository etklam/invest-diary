import {
  parseDailyPrices,
  type DailyPriceInput,
  type YahooChartQuote,
} from '~/lib/market-state/update-breadth-utils'
import { normalizeYahooSymbol, resolveYahooRangeStart, isYahooRateLimitError } from '~/lib/market-data/yahoo'
import { runYahooRequest } from '~/lib/market-data/yahoo-request-queue'

export interface YahooFinanceClient {
  chart: (symbol: string, options: Record<string, unknown>) => Promise<{ quotes: unknown[] }>
  quote: (symbol: string) => Promise<unknown>
}

export type YahooFinanceChartClient = Pick<YahooFinanceClient, 'chart'>

export interface DailyPricePrisma {
  marketDailyPrice: {
    upsert: (args: {
      where: { symbol_date: { symbol: string; date: Date } }
      update: {
        open: number
        high: number
        low: number
        close: number
        adjustedClose: number
        volume: bigint
      }
      create: DailyPriceInput
    }) => Promise<unknown>
  }
}

let yahooFinanceClient: YahooFinanceClient | null = null

/** Return the process-wide lazy Yahoo Finance client used by all Yahoo seams. */
export async function getYahooFinanceClient(): Promise<YahooFinanceClient> {
  if (yahooFinanceClient) return yahooFinanceClient

  const module = await import('yahoo-finance2')
  yahooFinanceClient = new module.default() as unknown as YahooFinanceClient
  return yahooFinanceClient
}

export async function fetchDailyOhlcv(
  symbol: string,
  range = '1y',
  client?: YahooFinanceChartClient,
  now: Date = new Date(),
): Promise<DailyPriceInput[]> {
  const yahooFinance = client ?? await getYahooFinanceClient()
  const normalized = normalizeYahooSymbol(symbol)
  const chart = await runYahooRequest(
    `daily:${normalized}:${range}`,
    () => yahooFinance.chart(normalized, {
      period1: resolveYahooRangeStart(range, now),
      period2: now,
      interval: '1d',
      return: 'array',
    }),
  )

  return parseDailyPrices(symbol, chart.quotes as YahooChartQuote[])
}

/** Persist every daily price through the one conflict-safe write strategy. */
export async function persistDailyPrices(
  prisma: DailyPricePrisma,
  prices: DailyPriceInput[],
): Promise<void> {
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

export { isYahooRateLimitError }
export type { DailyPriceInput, YahooChartQuote }
