import type { EtfDataProvider } from '~/lib/etf-profile/providers/base'
import { getEtfProviders } from '~/lib/etf-profile/providers/registry'
import type { EtfProfileResponse, RiskMetrics, RsMetrics, ValuationMetrics } from '~/lib/etf-profile/types'
import { EMPTY_RISK_METRICS, EMPTY_VALUATION_METRICS, createEmptyRs } from '~/lib/etf-profile/defaults'

type AggregateInput = {
  symbol: string
  benchmark: RsMetrics['benchmark']
  period: RsMetrics['period']
  providers?: EtfDataProvider[]
}

function mergeField<T extends Record<string, any>>(
  target: T,
  patch: Partial<T>,
  sourcePrefix: string,
  sourceName: string,
  sources: Record<string, string>
) {
  for (const [key, value] of Object.entries(patch)) {
    if (value === null || value === undefined) continue
    if (target[key as keyof T] !== null && target[key as keyof T] !== undefined) continue
    ;(target as any)[key] = value
    sources[`${sourcePrefix}.${key}`] = sourceName
  }
}

export async function aggregateEtfProfile(input: AggregateInput): Promise<EtfProfileResponse> {
  const providers = input.providers ?? getEtfProviders()
  const sources: Record<string, string> = {}

  const risk: RiskMetrics = { ...EMPTY_RISK_METRICS }
  const valuation: ValuationMetrics = { ...EMPTY_VALUATION_METRICS }
  let rs: RsMetrics = createEmptyRs(input.benchmark, input.period)

  let asOf: string | null = null

  for (const provider of providers) {
    try {
      const [riskResult, valuationResult, rsResult] = await Promise.all([
        provider.getRisk(input.symbol),
        provider.getValuation(input.symbol),
        provider.getRs(input.symbol, input.benchmark, input.period),
      ])

      if (!asOf) {
        asOf = riskResult.asOf ?? valuationResult.asOf ?? rsResult.asOf ?? null
      }

      mergeField(risk, riskResult.data, 'risk', provider.name, sources)
      mergeField(valuation, valuationResult.data, 'valuation', provider.name, sources)

      if (rs.relativeReturnPct === null && rsResult.data.relativeReturnPct !== undefined && rsResult.data.relativeReturnPct !== null) {
        rs.relativeReturnPct = rsResult.data.relativeReturnPct
        sources['rs.relativeReturnPct'] = provider.name
      }
      if (rs.trend === 'unknown' && rsResult.data.trend) {
        rs.trend = rsResult.data.trend
        sources['rs.trend'] = provider.name
      }
    } catch {
      // Provider failure should not break the profile response.
    }
  }

  return {
    symbol: input.symbol,
    risk,
    valuation,
    rs,
    meta: {
      asOf,
      fetchedAt: new Date().toISOString(),
      isStale: false,
      sources,
    },
  }
}
