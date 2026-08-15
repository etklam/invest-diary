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

export interface HistoricalQuote {
  timestamp: number
  close: number | null
}

export interface IntradayQuote {
  timestamp: number
  open: number | null
  high: number | null
  low: number | null
  close: number | null
  volume: number | null
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

interface YahooChartUrlOptions {
  interval: string
  range: string
}

const YAHOO_SYMBOL_ALIASES: Record<string, string> = {
  SPX: '^GSPC',
  DJI: '^DJI',
  IXIC: '^IXIC',
  NDX: '^NDX',
  RUT: '^RUT',
}

export function normalizeYahooSymbol(symbol: string): string {
  const normalized = symbol.trim().toUpperCase()
  return YAHOO_SYMBOL_ALIASES[normalized] ?? normalized
}

export function getYahooErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message.toLowerCase()
  }

  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') {
    return error.message.toLowerCase()
  }

  return String(error).toLowerCase()
}

export function isYahooRateLimitError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 429) {
    return true
  }

  const message = getYahooErrorMessage(error)
  return message.includes('rate') || message.includes('429') || message.includes('too many')
}

export function getYahooSymbolAliasSuggestion(symbol: string): string | null {
  const trimmed = symbol.trim()
  if (!trimmed) {
    return null
  }

  const uppercase = trimmed.toUpperCase()
  const normalized = normalizeYahooSymbol(trimmed)

  return normalized !== uppercase ? normalized : null
}

export function buildYahooChartUrl(symbol: string, options: YahooChartUrlOptions): string {
  const encodedSymbol = encodeURIComponent(normalizeYahooSymbol(symbol))
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=${options.interval}&range=${options.range}`
}

export function parseYahooRegularMarketPrice(response: YahooChartResponse): number | null {
  const price = response?.chart?.result?.[0]?.meta?.regularMarketPrice
  return typeof price === 'number' ? price : null
}

export function parseYahooQuoteResponse(response: YahooChartResponse): QuoteResponse | null {
  const meta = response?.chart?.result?.[0]?.meta

  if (!meta) {
    return null
  }

  const change = meta.regularMarketPrice - meta.previousClose
  const changePercent = meta.previousClose === 0 ? 0 : (change / meta.previousClose) * 100

  return {
    symbol: meta.symbol,
    regularMarketPrice: meta.regularMarketPrice,
    previousClose: meta.previousClose,
    change,
    changePercent,
    currency: meta.currency,
    marketState: meta.marketState,
    lastUpdateTime: new Date(meta.regularMarketTime * 1000).toISOString(),
  }
}

interface YahooLibraryQuoteLike {
  symbol?: string
  regularMarketPrice?: number
  regularMarketPreviousClose?: number
  currency?: string
  marketState?: string
  regularMarketTime?: Date
}

interface YahooLibraryChartQuoteLike {
  date?: Date
  open?: number | null
  high?: number | null
  low?: number | null
  close?: number | null
  volume?: number | null
  adjclose?: number | null
}

export function resolveYahooRangeStart(range: string, now: Date = new Date()): Date {
  const start = new Date(now)

  switch (range) {
    case '1mo':
      start.setMonth(start.getMonth() - 1)
      return start
    case '3mo':
      start.setMonth(start.getMonth() - 3)
      return start
    case '6mo':
      start.setMonth(start.getMonth() - 6)
      return start
    case '1y':
      start.setFullYear(start.getFullYear() - 1)
      return start
    case '5y':
      start.setFullYear(start.getFullYear() - 5)
      return start
    case 'max':
      return new Date('1970-01-01T00:00:00.000Z')
    default:
      start.setFullYear(start.getFullYear() - 1)
      return start
  }
}

export function parseYahooLibraryQuote(quote: YahooLibraryQuoteLike | null | undefined): QuoteResponse | null {
  if (!quote || typeof quote.symbol !== 'string' || typeof quote.regularMarketPrice !== 'number') {
    return null
  }

  const previousClose = typeof quote.regularMarketPreviousClose === 'number'
    ? quote.regularMarketPreviousClose
    : quote.regularMarketPrice
  const change = quote.regularMarketPrice - previousClose
  const changePercent = previousClose === 0 ? 0 : (change / previousClose) * 100

  return {
    symbol: quote.symbol,
    regularMarketPrice: quote.regularMarketPrice,
    previousClose,
    change,
    changePercent,
    currency: quote.currency ?? 'USD',
    marketState: quote.marketState ?? 'REGULAR',
    lastUpdateTime: (quote.regularMarketTime ?? new Date()).toISOString(),
  }
}

export function parseYahooLibraryDailyQuotes(quotes: YahooLibraryChartQuoteLike[]): HistoricalQuote[] {
  return quotes
    .filter((quote): quote is YahooLibraryChartQuoteLike & { date: Date; close: number } =>
      quote.date instanceof Date && typeof quote.close === 'number'
    )
    .map(quote => ({
      timestamp: Math.floor(quote.date.getTime() / 1000),
      close: quote.close,
    }))
}

export function parseYahooLibraryIntradayQuotes(quotes: YahooLibraryChartQuoteLike[]): IntradayQuote[] {
  return quotes
    .filter((quote): quote is YahooLibraryChartQuoteLike & { date: Date; close: number } =>
      quote.date instanceof Date && typeof quote.close === 'number'
    )
    .map(quote => ({
      timestamp: Math.floor(quote.date.getTime() / 1000),
      open: quote.open ?? null,
      high: quote.high ?? null,
      low: quote.low ?? null,
      close: quote.close,
      volume: quote.volume ?? null,
    }))
}

export function parseYahooLibraryMonthlyQuotes(quotes: YahooLibraryChartQuoteLike[]): YahooMonthlyQuote[] {
  return quotes
    .filter((quote): quote is YahooLibraryChartQuoteLike & { date: Date; close: number } =>
      quote.date instanceof Date && typeof quote.close === 'number'
    )
    .map(quote => ({
      timestamp: Math.floor(quote.date.getTime() / 1000),
      open: quote.open ?? null,
      high: quote.high ?? null,
      low: quote.low ?? null,
      close: quote.close,
      volume: quote.volume ?? null,
      adjClose: quote.adjclose ?? quote.close,
    }))
}

export function parseYahooMonthlyQuotes(response: YahooChartResponse): YahooMonthlyQuote[] {
  const result = response?.chart?.result?.[0]

  if (!result) {
    return []
  }

  const quotes = result.indicators?.quote?.[0]
  const adjclose = result.indicators?.adjclose?.[0]?.adjclose
  const timestamps = result.timestamp || []

  return timestamps
    .map((timestamp, index): YahooMonthlyQuote => ({
      timestamp,
      open: quotes?.open?.[index] ?? null,
      high: quotes?.high?.[index] ?? null,
      low: quotes?.low?.[index] ?? null,
      close: quotes?.close?.[index] ?? null,
      volume: quotes?.volume?.[index] ?? null,
      adjClose: adjclose?.[index] ?? quotes?.close?.[index] ?? null,
    }))
    .filter(quote => quote.close !== null)
}

export function parseYahooDailyQuotes(response: YahooChartResponse): HistoricalQuote[] {
  const result = response?.chart?.result?.[0]

  if (!result) {
    return []
  }

  const quotes = result.indicators?.quote?.[0]
  const timestamps = result.timestamp || []

  return timestamps
    .map((timestamp, index): HistoricalQuote => ({
      timestamp,
      close: quotes?.close?.[index] ?? null,
    }))
    .filter(quote => quote.close !== null)
}
