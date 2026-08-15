import {
  calcAboveMaPct,
  calcRatioNDaily,
  countMove4Pct,
  MARKET_BREADTH_MIN_COVERAGE_PCT,
} from './breadth'
import { determineRegime } from './regime'

export interface YahooChartQuote {
  date?: Date
  open?: number | null
  high?: number | null
  low?: number | null
  close?: number | null
  volume?: number | null
  adjclose?: number | null
}

export interface DailyPriceInput {
  symbol: string
  date: Date
  open: number
  high: number
  low: number
  close: number
  adjustedClose: number
  volume: bigint
}

export interface PricePoint {
  symbol: string
  date: Date
  adjustedClose: number
}

export interface BreadthHistoryPoint {
  date: Date
  up4Count: number
  down4Count: number
}

export interface BreadthDayResult {
  date: Date
  universeCount: number
  up4Count: number
  down4Count: number
  up4Pct: number
  down4Pct: number
  above40dCount: number
  above40dPct: number
  ratio5d: number
  ratio10d: number
  regime: string
  score: number
  coveragePct: number
  isStale: boolean
}

export function toDateOnly(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()))
}

export function toDateKey(date: Date): string {
  return toDateOnly(date).toISOString().slice(0, 10)
}

export function isFinitePrice(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0
}

export function parseDailyPrices(symbol: string, quotes: YahooChartQuote[]): DailyPriceInput[] {
  return quotes
    .filter((quote): quote is YahooChartQuote & {
      date: Date
      open: number
      high: number
      low: number
      close: number
    } =>
      quote.date instanceof Date
        && isFinitePrice(quote.open)
        && isFinitePrice(quote.high)
        && isFinitePrice(quote.low)
        && isFinitePrice(quote.close),
    )
    .map((quote) => {
      const adjustedClose = isFinitePrice(quote.adjclose) ? quote.adjclose : quote.close
      const volume = typeof quote.volume === 'number' && Number.isFinite(quote.volume) && quote.volume > 0
        ? BigInt(Math.trunc(quote.volume))
        : BigInt(0)

      return {
        symbol,
        date: toDateOnly(quote.date),
        open: quote.open,
        high: quote.high,
        low: quote.low,
        close: quote.close,
        adjustedClose,
        volume,
      }
    })
}

export function groupPricesBySymbol(prices: PricePoint[]): Map<string, PricePoint[]> {
  const grouped = new Map<string, PricePoint[]>()
  for (const price of prices) {
    const symbolPrices = grouped.get(price.symbol) ?? []
    symbolPrices.push(price)
    grouped.set(price.symbol, symbolPrices)
  }

  for (const symbolPrices of Array.from(grouped.values())) {
    symbolPrices.sort((a, b) => a.date.getTime() - b.date.getTime())
  }

  return grouped
}

export function calculateBreadthRows(
  prices: PricePoint[],
  symbols: string[],
  datesToCalculate: Date[],
  existingBreadthHistory: BreadthHistoryPoint[],
): BreadthDayResult[] {
  const universeCount = symbols.length
  const targetDateKeys = new Set(datesToCalculate.map(toDateKey))
  const pricesBySymbol = groupPricesBySymbol(prices)
  const rows: BreadthDayResult[] = []
  let historyForRatio = existingBreadthHistory
    .map(item => ({
      dateKey: toDateKey(item.date),
      up4Count: item.up4Count,
      down4Count: item.down4Count,
    }))
    .sort((a, b) => a.dateKey.localeCompare(b.dateKey))

  const allDateKeys = Array.from(new Set(prices.map(price => toDateKey(price.date)))).sort()

  for (const dateKey of allDateKeys) {
    const moveInputs: Array<{ close: number; previousClose: number }> = []
    const maInputs: Array<{ close: number; sma: number }> = []
    let coveredCount = 0

    for (const symbol of symbols) {
      const symbolPrices = pricesBySymbol.get(symbol)
      if (!symbolPrices) continue

      const index = symbolPrices.findIndex(price => toDateKey(price.date) === dateKey)
      if (index < 0) continue

      const current = symbolPrices[index]
      if (!current) continue

      coveredCount += 1

      const previous = symbolPrices[index - 1]
      if (previous) {
        moveInputs.push({
          close: current.adjustedClose,
          previousClose: previous.adjustedClose,
        })
      }

      if (index >= 39) {
        const smaWindow = symbolPrices.slice(index - 39, index + 1)
        const sma = smaWindow.reduce((sum, price) => sum + price.adjustedClose, 0) / smaWindow.length
        maInputs.push({ close: current.adjustedClose, sma })
      }
    }

    const { up4Count, down4Count } = countMove4Pct(moveInputs)
    const above40dPct = calcAboveMaPct(maInputs, universeCount)
    const above40dCount = maInputs.filter(price => price.close > price.sma).length
    const up4Pct = universeCount > 0 ? (up4Count / universeCount) * 100 : 0
    const down4Pct = universeCount > 0 ? (down4Count / universeCount) * 100 : 0

    const currentHistoryItem = { dateKey, up4Count, down4Count }
    const currentRatioHistory = [
      ...historyForRatio.filter(item => item.dateKey < dateKey),
      currentHistoryItem,
    ]
    const ratio5d = calcRatioNDaily(currentRatioHistory, 5)
    const ratio10d = calcRatioNDaily(currentRatioHistory, 10)
    const regime = determineRegime({
      up4Count,
      down4Count,
      universeCount,
      above40dPct,
      ratio10d,
    })

    if (!targetDateKeys.has(dateKey)) {
      continue
    }

    historyForRatio = [
      ...historyForRatio.filter(item => item.dateKey !== dateKey),
      currentHistoryItem,
    ].sort((a, b) => a.dateKey.localeCompare(b.dateKey))

    const coveragePct = universeCount > 0 ? (coveredCount / universeCount) * 100 : 0
    rows.push({
      date: new Date(`${dateKey}T00:00:00.000Z`),
      universeCount,
      up4Count,
      down4Count,
      up4Pct: regime.up4Pct || up4Pct,
      down4Pct: regime.down4Pct || down4Pct,
      above40dCount,
      above40dPct,
      ratio5d,
      ratio10d,
      regime: regime.regime,
      score: regime.score,
      coveragePct,
      isStale: coveragePct < MARKET_BREADTH_MIN_COVERAGE_PCT,
    })
  }

  return rows
}
