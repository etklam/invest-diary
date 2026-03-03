import type { RiskMetrics, RsMetrics, ValuationMetrics } from '~/lib/etf-profile/types'

export interface ProviderResult<T> {
  data: Partial<T>
  asOf?: string | null
}

export interface EtfDataProvider {
  name: string
  getRisk(symbol: string): Promise<ProviderResult<RiskMetrics>>
  getValuation(symbol: string): Promise<ProviderResult<ValuationMetrics>>
  getRs(
    symbol: string,
    benchmark: RsMetrics['benchmark'],
    period: RsMetrics['period']
  ): Promise<ProviderResult<Pick<RsMetrics, 'relativeReturnPct' | 'trend'>>>
}
