import type { EtfProfileResponse, RiskMetrics, RsMetrics, ValuationMetrics } from '~/lib/etf-profile/types'

export const EMPTY_RISK_METRICS: RiskMetrics = {
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

export const EMPTY_VALUATION_METRICS: ValuationMetrics = {
  aum: null,
  expenseRatioPct: null,
  pe: null,
  pb: null,
  dividendYieldPct: null,
}

export function createEmptyRs(benchmark: RsMetrics['benchmark'], period: RsMetrics['period']): RsMetrics {
  return {
    benchmark,
    period,
    relativeReturnPct: null,
    trend: 'unknown',
  }
}

export function createEmptyProfile(
  symbol: string,
  benchmark: RsMetrics['benchmark'],
  period: RsMetrics['period'],
  isStale: boolean
): EtfProfileResponse {
  return {
    symbol,
    risk: { ...EMPTY_RISK_METRICS },
    valuation: { ...EMPTY_VALUATION_METRICS },
    rs: createEmptyRs(benchmark, period),
    meta: {
      asOf: null,
      fetchedAt: new Date().toISOString(),
      isStale,
      sources: {},
    },
  }
}
