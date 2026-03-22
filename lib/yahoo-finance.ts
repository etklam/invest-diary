import {
  buildYahooChartUrl,
  parseYahooMonthlyQuotes,
  parseYahooQuoteResponse,
  type QuoteResponse,
  type YahooChartResponse,
  type YahooMonthlyQuote,
  type YahooQuoteMeta,
  type YahooQuoteResult,
} from '~/lib/market-data/yahoo'

export type {
  QuoteResponse,
  YahooChartResponse,
  YahooMonthlyQuote,
  YahooQuoteMeta,
  YahooQuoteResult,
} from '~/lib/market-data/yahoo'

/**
 * Fetch real-time quote for a symbol
 * @param symbol ETF symbol (e.g., "SPY", "QQQ", "0050.TW")
 */
export async function fetchQuote(symbol: string): Promise<QuoteResponse> {
  const url = buildYahooChartUrl(symbol, { interval: '1d', range: '1d' })

  const response = await $fetch<YahooChartResponse>(url)

  const quote = parseYahooQuoteResponse(response)
  if (!quote) {
    throw new Error('Yahoo quote unavailable')
  }
  return quote
}

/**
 * Fetch monthly historical data for a symbol
 * @param symbol ETF symbol
 * @param years Number of years of history to fetch (default: 5)
 */
export async function fetchMonthlyData(symbol: string, years = 5): Promise<YahooMonthlyQuote[]> {
  const url = buildYahooChartUrl(symbol, { interval: '1mo', range: `${years}y` })

  const response = await $fetch<YahooChartResponse>(url)

  const quotes = parseYahooMonthlyQuotes(response)
  if (quotes.length === 0) {
    throw new Error('Yahoo historical data unavailable')
  }
  return quotes
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
