import { aggregateEtfProfile } from '~/lib/etf-profile/aggregator'
import { buildEtfResearchCacheKey, getCached, getStaleCached, setCached } from '~/lib/etf-profile/cache'
import { computeRiskMetrics } from '~/lib/etf-profile/calculators/risk'
import { computeRelativeStrength } from '~/lib/etf-profile/calculators/rs'
import { createEmptyProfile, createEmptyRs, EMPTY_RISK_METRICS } from '~/lib/etf-profile/defaults'
import type { EtfProfileResponse, RsMetrics } from '~/lib/etf-profile/types'
import { fetchMonthlyData } from '~/lib/yahoo-finance'

type ReadEtfResearchInput = {
  symbol: string
  benchmark: RsMetrics['benchmark']
  period: RsMetrics['period']
  bypassCache?: boolean
}

export async function readEtfResearch(input: ReadEtfResearchInput): Promise<EtfProfileResponse> {
  const symbol = input.symbol.trim().toUpperCase()
  const cacheKey = buildEtfResearchCacheKey(symbol, input.benchmark, input.period)
  const cached = input.bypassCache ? null : getCached<EtfProfileResponse>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const [profileResult, symbolDataResult, benchmarkDataResult] = await Promise.allSettled([
      aggregateEtfProfile({
        symbol,
        benchmark: input.benchmark,
        period: input.period,
      }),
      fetchMonthlyData(symbol, 5),
      fetchMonthlyData(input.benchmark, 1),
    ])
    const allFailed = profileResult.status === 'rejected'
      && symbolDataResult.status === 'rejected'
      && benchmarkDataResult.status === 'rejected'
    if (allFailed) {
      const stale = getStaleCached<EtfProfileResponse>(cacheKey)
      if (stale) {
        return markStale(stale)
      }
    }

    const profile = profileResult.status === 'fulfilled'
      ? profileResult.value
      : createEmptyProfile(symbol, input.benchmark, input.period, true)
    const symbolData = symbolDataResult.status === 'fulfilled' ? symbolDataResult.value : null
    const benchmarkData = benchmarkDataResult.status === 'fulfilled' ? benchmarkDataResult.value : null
    const risk = symbolData
      ? computeRiskMetrics(symbolData.map(row => ({
        close: row.adjClose ?? row.close ?? 0,
        volume: row.volume,
      })))
      : { ...EMPTY_RISK_METRICS }
    const rs = symbolData && benchmarkData
      ? computeRelativeStrength(
        symbolData.map(row => ({ close: row.adjClose ?? row.close ?? 0 })),
        benchmarkData.map(row => ({ close: row.adjClose ?? row.close ?? 0 })),
        input.period
      )
      : createEmptyRs(input.benchmark, input.period)
    const isStale = profileResult.status === 'rejected'
      || symbolDataResult.status === 'rejected'
      || benchmarkDataResult.status === 'rejected'

    const result: EtfProfileResponse = {
      ...profile,
      symbol,
      risk,
      rs: {
        benchmark: input.benchmark,
        period: input.period,
        ...rs,
      },
      meta: {
        ...profile.meta,
        fetchedAt: new Date().toISOString(),
        isStale,
        sources: {
          ...profile.meta.sources,
          ...buildMetricSources('risk', risk),
          ...(symbolData && benchmarkData ? buildMetricSources('rs', rs) : {}),
        },
      },
    }

    setCached(cacheKey, result)
    return result
  } catch {
    const stale = getStaleCached<EtfProfileResponse>(cacheKey)
    if (stale) {
      return markStale(stale)
    }

    return createEmptyProfile(symbol, input.benchmark, input.period, true)
  }
}

function markStale(profile: EtfProfileResponse): EtfProfileResponse {
  return {
    ...profile,
    meta: {
      ...profile.meta,
      isStale: true,
    },
  }
}

function buildMetricSources(prefix: string, metrics: object): Record<string, string> {
  return Object.fromEntries(
    Object.entries(metrics)
      .filter(([, value]) => value !== null && value !== undefined)
      .map(([key]) => [`${prefix}.${key}`, 'yahoo'])
  )
}
