export type MaStatus = 'ABOVE' | 'BELOW'

export interface HistoricalClose {
  timestamp: number
  close: number | null
}

export interface QuoteSnapshot {
  regularMarketPrice: number
  previousClose: number
}

export interface PresetEtf {
  symbol: string
  sector: string
}

export interface SectorTrendRow {
  symbol: string
  sector: string
  rsi: number | null
  last: number | null
  dailyChange: number | null
  weeklyChange: number | null
  ema10: number | null
  ema20: number | null
  sma50: number | null
  ema10Status: MaStatus | null
  ema20Status: MaStatus | null
  sma50Status: MaStatus | null
  ytdHighDistance: number | null
  latestDate: string | null
  closeCount: number
  recentCloses: number[]
  error?: string
}

export function calculateSma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null
  const slice = values.slice(-period)
  return slice.reduce((sum, value) => sum + value, 0) / period
}

export function calculateEma(values: number[], period: number): number | null {
  if (period <= 0 || values.length < period) return null
  const multiplier = 2 / (period + 1)
  let ema = values.slice(0, period).reduce((sum, value) => sum + value, 0) / period

  for (const value of values.slice(period)) {
    ema = (value - ema) * multiplier + ema
  }

  return ema
}

export function calculateRsi(values: number[], period = 14): number | null {
  if (period <= 0 || values.length <= period) return null

  let gains = 0
  let losses = 0

  for (let index = 1; index <= period; index += 1) {
    const current = values[index]
    const previous = values[index - 1]
    if (current === undefined || previous === undefined) continue
    const change = current - previous
    if (change >= 0) gains += change
    else losses += Math.abs(change)
  }

  let averageGain = gains / period
  let averageLoss = losses / period

  for (let index = period + 1; index < values.length; index += 1) {
    const current = values[index]
    const previous = values[index - 1]
    if (current === undefined || previous === undefined) continue
    const change = current - previous
    const gain = Math.max(change, 0)
    const loss = Math.max(-change, 0)
    averageGain = (averageGain * (period - 1) + gain) / period
    averageLoss = (averageLoss * (period - 1) + loss) / period
  }

  if (averageLoss === 0) return 100
  const relativeStrength = averageGain / averageLoss
  return 100 - (100 / (1 + relativeStrength))
}

export function getMovingAverageStatus(price: number | null, movingAverage: number | null): MaStatus | null {
  if (price === null || movingAverage === null) return null
  return price > movingAverage ? 'ABOVE' : 'BELOW'
}

export function buildFallbackSectorTrendRow(etf: PresetEtf, error?: string): SectorTrendRow {
  return {
    symbol: etf.symbol,
    sector: etf.sector,
    rsi: null,
    last: null,
    dailyChange: null,
    weeklyChange: null,
    ema10: null,
    ema20: null,
    sma50: null,
    ema10Status: null,
    ema20Status: null,
    sma50Status: null,
    ytdHighDistance: null,
    latestDate: null,
    closeCount: 0,
    recentCloses: [],
    error,
  }
}

export function buildSectorTrendRow(
  etf: PresetEtf,
  history: HistoricalClose[],
  quote: QuoteSnapshot | null,
  now = new Date(),
): SectorTrendRow {
  const validHistory = history
    .filter((item): item is HistoricalClose & { close: number } => typeof item.close === 'number')
    .sort((a, b) => a.timestamp - b.timestamp)

  const closes = validHistory.map(item => item.close)
  const previousClose = quote?.previousClose ?? closes.at(-2) ?? closes.at(-1) ?? null
  const last = quote?.regularMarketPrice ?? closes.at(-1) ?? null
  const fiveTradingDaysAgo = closes.length > 5 ? closes.at(-6) ?? null : closes.at(0) ?? null
  const currentYear = now.getFullYear()
  const ytdCloses = validHistory
    .filter(item => new Date(item.timestamp * 1000).getFullYear() === currentYear)
    .map(item => item.close)
  const ytdHigh = ytdCloses.length ? Math.max(...ytdCloses) : null
  const ema10 = calculateEma(closes, 10)
  const ema20 = calculateEma(closes, 20)
  const sma50 = calculateSma(closes, 50)

  return {
    symbol: etf.symbol,
    sector: etf.sector,
    rsi: calculateRsi(closes),
    last,
    dailyChange: last !== null && previousClose ? ((last - previousClose) / previousClose) * 100 : null,
    weeklyChange: last !== null && fiveTradingDaysAgo ? ((last - fiveTradingDaysAgo) / fiveTradingDaysAgo) * 100 : null,
    ema10,
    ema20,
    sma50,
    ema10Status: getMovingAverageStatus(last, ema10),
    ema20Status: getMovingAverageStatus(last, ema20),
    sma50Status: getMovingAverageStatus(last, sma50),
    ytdHighDistance: last !== null && ytdHigh ? ((last - ytdHigh) / ytdHigh) * 100 : null,
    latestDate: validHistory.at(-1) ? new Date(validHistory.at(-1)!.timestamp * 1000).toISOString() : null,
    closeCount: closes.length,
    recentCloses: closes.slice(-30),
  }
}

export function buildSparklinePoints(values: number[], width = 320, height = 96, padding = 8): string {
  if (values.length < 2) return ''

  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const innerWidth = width - padding * 2
  const innerHeight = height - padding * 2

  return values
    .map((value, index) => {
      const x = padding + (index / (values.length - 1)) * innerWidth
      const y = padding + ((max - value) / range) * innerHeight
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}
