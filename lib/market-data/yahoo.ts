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

interface YahooChartUrlOptions {
  interval: string
  range: string
}

const YAHOO_HEADERS = {
  'User-Agent': 'Mozilla/5.0',
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

async function defaultFetchYahooJson(url: string): Promise<YahooChartResponse> {
  const response = await fetch(url, {
    headers: YAHOO_HEADERS,
  })

  if (!response.ok) {
    throw new Error(`Yahoo request failed: ${response.status}`)
  }

  return response.json() as Promise<YahooChartResponse>
}

export async function fetchYahooRegularMarketPrice(
  symbol: string,
  fetchJson: (url: string) => Promise<YahooChartResponse> = defaultFetchYahooJson
): Promise<number | null> {
  try {
    const response = await fetchJson(buildYahooChartUrl(symbol, { interval: '1d', range: '1d' }))
    return parseYahooRegularMarketPrice(response)
  } catch {
    return null
  }
}
