export const PROFILE_SCHEMA_VERSION = 1

export interface RiskMetrics {
  week52High: number | null
  week52Low: number | null
  distanceTo52WHighPct: number | null
  distanceTo52WLowPct: number | null
  volatility20dAnn: number | null
  volatility60dAnn: number | null
  volatility252dAnn: number | null
  maxDrawdown1yPct: number | null
  volume: number | null
  avgVolume20d: number | null
  volumeSpikeRatio: number | null
}

export interface ValuationMetrics {
  aum: number | null
  expenseRatioPct: number | null
  pe: number | null
  pb: number | null
  dividendYieldPct: number | null
}

export interface RsMetrics {
  benchmark: 'SPY' | 'QQQ'
  period: '1m' | '3m' | '6m' | '1y'
  relativeReturnPct: number | null
  trend: 'strengthening' | 'weakening' | 'neutral' | 'unknown'
}

export interface ProfileMeta {
  asOf: string | null
  fetchedAt: string
  isStale: boolean
  sources: Record<string, string>
}

export interface EtfProfileResponse {
  symbol: string
  risk: RiskMetrics
  valuation: ValuationMetrics
  rs: RsMetrics
  meta: ProfileMeta
}
