import type { RiskMetrics } from '~/lib/etf-profile/types'

type PriceVolumePoint = {
  close: number
  volume?: number | null
}

const TRADING_DAYS_PER_YEAR = 252

function toReturns(series: PriceVolumePoint[]): number[] {
  const returns: number[] = []
  for (let i = 1; i < series.length; i += 1) {
    const prev = series[i - 1]?.close
    const curr = series[i]?.close
    if (!prev || !curr) continue
    returns.push((curr - prev) / prev)
  }
  return returns
}

function annualizedVolatility(returns: number[]): number | null {
  if (returns.length < 1) return null
  const mean = returns.reduce((sum, value) => sum + value, 0) / returns.length
  const variance = returns.reduce((sum, value) => sum + (value - mean) ** 2, 0) / returns.length
  return Math.sqrt(variance) * Math.sqrt(TRADING_DAYS_PER_YEAR) * 100
}

function maxDrawdown(series: PriceVolumePoint[]): number | null {
  if (series.length < 1) return null
  let peak = series[0]!.close
  let worst = 0
  for (const point of series) {
    if (point.close > peak) peak = point.close
    const dd = ((point.close - peak) / peak) * 100
    if (dd < worst) worst = dd
  }
  return worst
}

export function computeRiskMetrics(series: PriceVolumePoint[]): RiskMetrics {
  if (series.length < 1) {
    return {
      week52High: null,
      week52Low: null,
      distanceTo52WHighPct: null,
      distanceTo52WLowPct: null,
      volatility20dAnn: null,
      volatility60dAnn: null,
      volatility252dAnn: null,
      maxDrawdown1yPct: null,
      volume: null,
      avgVolume20d: null,
      volumeSpikeRatio: null,
    }
  }

  const closes = series.map(s => s.close)
  const current = closes.at(-1) ?? null
  const week52High = Math.max(...closes)
  const week52Low = Math.min(...closes)
  const distanceTo52WHighPct = current ? ((current - week52High) / week52High) * 100 : null
  const distanceTo52WLowPct = current ? ((current - week52Low) / week52Low) * 100 : null

  const returns20 = toReturns(series.slice(-20))
  const returns60 = toReturns(series.slice(-60))
  const returns252 = toReturns(series.slice(-252))

  const recentVolumes = series.slice(-20).map(s => s.volume).filter((v): v is number => typeof v === 'number')
  const volume = typeof series.at(-1)?.volume === 'number' ? (series.at(-1)?.volume as number) : null
  const avgVolume20d = recentVolumes.length > 0
    ? recentVolumes.reduce((sum, value) => sum + value, 0) / recentVolumes.length
    : null
  const volumeSpikeRatio = volume !== null && avgVolume20d ? volume / avgVolume20d : null

  return {
    week52High,
    week52Low,
    distanceTo52WHighPct,
    distanceTo52WLowPct,
    volatility20dAnn: annualizedVolatility(returns20),
    volatility60dAnn: annualizedVolatility(returns60),
    volatility252dAnn: annualizedVolatility(returns252),
    maxDrawdown1yPct: maxDrawdown(series.slice(-252)),
    volume,
    avgVolume20d,
    volumeSpikeRatio,
  }
}
