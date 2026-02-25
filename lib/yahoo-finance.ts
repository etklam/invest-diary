/**
 * Yahoo Finance API Types
 */
export interface YahooQuoteMeta {
  symbol: string
  regularMarketPrice: number
  previousClose: number
  currency: string
  marketState: string
  regularMarketTime: number
}

export interface YahooQuoteResult {
  meta: YahooQuoteMeta
  timestamp?: number[]
  indicators?: {
    quote?: Array<{
      open?: Array<number | null>
      high?: Array<number | null>
      low?: Array<number | null>
      close?: Array<number | null>
      volume?: Array<number | null>
    }>
    adjclose?: Array<{
      adjclose?: Array<number | null>
    }>
  }
}

export interface YahooChartResponse {
  chart: {
    result?: YahooQuoteResult[]
    error: null | { code: number; description: string }
  }
}

export interface YahooMonthlyQuote {
  timestamp: number
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
  adjClose: number | null
}

export interface QuoteResponse {
  symbol: string
  regularMarketPrice: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  marketState: string
  lastUpdateTime: string
}

/**
 * Fetch real-time quote for a symbol
 * @param symbol ETF symbol (e.g., "SPY", "QQQ", "0050.TW")
 */
export async function fetchQuote(symbol: string): Promise<QuoteResponse> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1d`

  const response = await $fetch<YahooChartResponse>(url)

  const result = response?.chart?.result?.[0]
  if (!result?.meta) {
    throw new Error('Yahoo quote unavailable')
  }

  const quote = result.meta
  const change = quote.regularMarketPrice - quote.previousClose
  const changePercent = (change / quote.previousClose) * 100

  return {
    symbol: quote.symbol,
    regularMarketPrice: quote.regularMarketPrice,
    previousClose: quote.previousClose,
    change,
    changePercent,
    currency: quote.currency,
    marketState: quote.marketState,
    lastUpdateTime: new Date(quote.regularMarketTime * 1000).toISOString(),
  }
}

/**
 * Fetch monthly historical data for a symbol
 * @param symbol ETF symbol
 * @param years Number of years of history to fetch (default: 5)
 */
export async function fetchMonthlyData(symbol: string, years = 5): Promise<YahooMonthlyQuote[]> {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1mo&range=${years}y`

  const response = await $fetch<YahooChartResponse>(url)

  const result = response?.chart?.result?.[0]
  if (!result) {
    throw new Error('Yahoo historical data unavailable')
  }

  const quotes = result.indicators?.quote?.[0]
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose
  const timestamps = result.timestamp || []

  return timestamps
    .map((ts: number, i: number): YahooMonthlyQuote => ({
      timestamp: ts,
      open: quotes?.open?.[i] ?? null,
      high: quotes?.high?.[i] ?? null,
      low: quotes?.low?.[i] ?? null,
      close: quotes?.close?.[i] ?? null,
      volume: quotes?.volume?.[i] ?? null,
      adjClose: adjclose?.[i] ?? quotes?.close?.[i] ?? null,
    }))
    .filter((q: YahooMonthlyQuote) => q.close !== null)
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
