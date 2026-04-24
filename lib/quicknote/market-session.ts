import type { IntradayQuote, QuoteResponse } from '~/lib/yahoo-finance'
import type { ReflectionMarketConditionKey } from '~/lib/quicknote/template-localization'

export interface MarketSessionInput {
  previousClose: number
  open: number
  close: number
  high?: number | null
  low?: number | null
}

export interface SpxSessionSummary {
  symbol: string
  sourceSymbol: string
  condition: ReflectionMarketConditionKey
  price: number
  previousClose: number
  open: number
  high: number | null
  low: number | null
  change: number
  changePercent: number
  intradayMovePercent: number
  openGapPercent: number
  asOf: string
}

const STRONG_MOVE_PCT = 1.2
const SMALL_MOVE_PCT = 0.25
const GAP_PCT = 0.35
const INTRADAY_TREND_PCT = 0.35
const CHOPPY_RANGE_PCT = 1.2

function percentChange(current: number, base: number): number {
  if (!Number.isFinite(current) || !Number.isFinite(base) || base === 0) return 0
  return ((current - base) / base) * 100
}

export function classifyMarketSession(input: MarketSessionInput): ReflectionMarketConditionKey {
  const changePercent = percentChange(input.close, input.previousClose)
  const openGapPercent = percentChange(input.open, input.previousClose)
  const intradayMovePercent = percentChange(input.close, input.open)
  const high = input.high ?? Math.max(input.open, input.close)
  const low = input.low ?? Math.min(input.open, input.close)
  const rangePercent = percentChange(high, low)
  const lowVsPreviousClosePercent = percentChange(low, input.previousClose)
  const highVsPreviousClosePercent = percentChange(high, input.previousClose)

  if (openGapPercent <= -GAP_PCT && intradayMovePercent >= INTRADAY_TREND_PCT) {
    return 'gapDownRecovery'
  }
  if (openGapPercent <= -GAP_PCT && intradayMovePercent <= -INTRADAY_TREND_PCT) {
    return 'gapDownAndGo'
  }
  if (openGapPercent >= GAP_PCT && intradayMovePercent >= INTRADAY_TREND_PCT) {
    return 'gapUpAndGo'
  }
  if (openGapPercent >= GAP_PCT && intradayMovePercent <= -INTRADAY_TREND_PCT) {
    return 'gapUpFade'
  }
  if (lowVsPreviousClosePercent <= -GAP_PCT && changePercent >= SMALL_MOVE_PCT) {
    return 'gapDownRecovery'
  }
  if (highVsPreviousClosePercent >= GAP_PCT && changePercent <= -SMALL_MOVE_PCT) {
    return 'gapUpFade'
  }
  if (rangePercent >= CHOPPY_RANGE_PCT && Math.abs(changePercent) < GAP_PCT) {
    return 'choppySession'
  }
  if (changePercent >= STRONG_MOVE_PCT) return 'strongUp'
  if (changePercent >= SMALL_MOVE_PCT) return 'slightUp'
  if (changePercent <= -STRONG_MOVE_PCT) return 'strongDown'
  if (changePercent <= -SMALL_MOVE_PCT) return 'slightDown'
  return 'rangeBound'
}

function getTradingDayKey(timestamp: number): string {
  return new Date(timestamp * 1000).toISOString().slice(0, 10)
}

function pickLatestSessionQuotes(quotes: IntradayQuote[]): IntradayQuote[] {
  const validQuotes = quotes.filter(quote => typeof quote.close === 'number')
  const latest = validQuotes.at(-1)
  if (!latest) return []

  const latestDay = getTradingDayKey(latest.timestamp)
  return validQuotes.filter(quote => getTradingDayKey(quote.timestamp) === latestDay)
}

export function buildSpxSessionSummary(
  quote: QuoteResponse,
  intradayQuotes: IntradayQuote[]
): SpxSessionSummary {
  const sessionQuotes = pickLatestSessionQuotes(intradayQuotes)
  const first = sessionQuotes[0]
  const last = sessionQuotes.at(-1)

  const close = quote.regularMarketPrice
  const open = first?.open ?? first?.close ?? quote.previousClose
  const high = sessionQuotes.length
    ? Math.max(...sessionQuotes.map(item => item.high ?? item.close ?? open))
    : null
  const low = sessionQuotes.length
    ? Math.min(...sessionQuotes.map(item => item.low ?? item.close ?? open))
    : null
  const asOf = last?.timestamp
    ? new Date(last.timestamp * 1000).toISOString()
    : quote.lastUpdateTime

  return {
    symbol: 'SPX',
    sourceSymbol: quote.symbol,
    condition: classifyMarketSession({
      previousClose: quote.previousClose,
      open,
      close,
      high,
      low,
    }),
    price: close,
    previousClose: quote.previousClose,
    open,
    high,
    low,
    change: close - quote.previousClose,
    changePercent: percentChange(close, quote.previousClose),
    intradayMovePercent: percentChange(close, open),
    openGapPercent: percentChange(open, quote.previousClose),
    asOf,
  }
}
