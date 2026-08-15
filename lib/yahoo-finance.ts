import {
  normalizeYahooSymbol,
  parseYahooLibraryDailyQuotes,
  parseYahooLibraryIntradayQuotes,
  parseYahooLibraryMonthlyQuotes,
  parseYahooLibraryQuote,
  resolveYahooRangeStart,
  type QuoteResponse,
  type YahooMonthlyQuote,
  type HistoricalQuote,
  type IntradayQuote,
} from '~/lib/market-data/yahoo'
import { getYahooFinanceClient } from '~/lib/market-data/daily-prices'
import { runYahooRequest } from '~/lib/market-data/yahoo-request-queue'

type YahooChartInterval = '1m' | '2m' | '5m' | '15m' | '30m' | '60m' | '90m' | '1h' | '1d' | '5d' | '1wk' | '1mo' | '3mo'

type YahooLibraryQuoteInput = Parameters<typeof parseYahooLibraryQuote>[0]
type YahooLibraryChartQuoteInput = Parameters<typeof parseYahooLibraryDailyQuotes>[0][number]

export type {
  QuoteResponse,
  YahooChartResponse,
  HistoricalQuote,
  IntradayQuote,
  YahooMonthlyQuote,
  YahooQuoteMeta,
  YahooQuoteResult,
} from '~/lib/market-data/yahoo'

/**
 * Fetch real-time quote for a symbol
 * @param symbol ETF symbol (e.g., "SPY", "QQQ", "0050.TW")
 */
export async function fetchQuote(symbol: string): Promise<QuoteResponse> {
  const normalized = normalizeYahooSymbol(symbol)

  return runYahooRequest(`quote:${normalized}`, async () => {
    const yahooFinance = await getYahooFinanceClient()
    const quote = await yahooFinance.quote(normalized)
    const parsed = parseYahooLibraryQuote(quote as YahooLibraryQuoteInput)

    if (!parsed) {
      throw new Error('Yahoo quote unavailable')
    }

    return parsed
  })
}

export async function fetchHistoricalData(
  symbol: string,
  range: string = '1y',
  interval: string = '1d'
): Promise<HistoricalQuote[]> {
  const normalized = normalizeYahooSymbol(symbol)
  const key = `historical:${normalized}:${range}:${interval}`

  return runYahooRequest(key, async () => {
    const yahooFinance = await getYahooFinanceClient()
    const quotes = await yahooFinance.chart(normalized, {
      period1: resolveYahooRangeStart(range),
      period2: new Date(),
      interval: interval as YahooChartInterval,
      return: 'array',
    })

    return parseYahooLibraryDailyQuotes(quotes.quotes as YahooLibraryChartQuoteInput[])
  })
}

export async function fetchIntradayData(
  symbol: string,
  days = 3,
  interval: string = '5m'
): Promise<IntradayQuote[]> {
  const normalized = normalizeYahooSymbol(symbol)
  const key = `intraday:${normalized}:${days}:${interval}`

  return runYahooRequest(key, async () => {
    const yahooFinance = await getYahooFinanceClient()
    const start = new Date()
    start.setDate(start.getDate() - days)

    const quotes = await yahooFinance.chart(normalized, {
      period1: start,
      period2: new Date(),
      interval: interval as YahooChartInterval,
      return: 'array',
    })

    return parseYahooLibraryIntradayQuotes(quotes.quotes as YahooLibraryChartQuoteInput[])
  })
}

/**
 * Fetch monthly historical data for a symbol
 * @param symbol ETF symbol
 * @param years Number of years of history to fetch (default: 5)
 */
export async function fetchMonthlyData(symbol: string, years = 5): Promise<YahooMonthlyQuote[]> {
  const normalized = normalizeYahooSymbol(symbol)
  const key = `monthly:${normalized}:${years}`

  return runYahooRequest(key, async () => {
    const yahooFinance = await getYahooFinanceClient()
    const start = new Date()
    start.setFullYear(start.getFullYear() - years)

    const quotes = await yahooFinance.chart(normalized, {
      period1: start,
      period2: new Date(),
      interval: '1mo',
      return: 'array',
    })

    const parsed = parseYahooLibraryMonthlyQuotes(quotes.quotes as YahooLibraryChartQuoteInput[])
    if (parsed.length === 0) {
      throw new Error('Yahoo historical data unavailable')
    }
    return parsed
  })
}

/**
 * Validate if a symbol exists on Yahoo Finance
 * @param symbol ETF symbol to validate
 */
export async function validateSymbol(symbol: string): Promise<boolean> {
  try {
    await fetchQuote(symbol)
    return true
  } catch {
    return false
  }
}
