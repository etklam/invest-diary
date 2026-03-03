import { aggregateEtfProfile } from '~/lib/etf-profile/aggregator'
import { createEmptyProfile } from '~/lib/etf-profile/defaults'
import { getCached, setCached } from '~/lib/etf-profile/cache'
import type { RsMetrics } from '~/lib/etf-profile/types'

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing symbol',
    })
  }

  const normalizedSymbol = symbol.toUpperCase()
  const benchmark: RsMetrics['benchmark'] = 'SPY'
  const period: RsMetrics['period'] = '3m'
  const cacheKey = `etf-profile:${normalizedSymbol}:${benchmark}:${period}`

  const cached = getCached<any>(cacheKey)
  if (cached) {
    return cached
  }

  try {
    const profile = await aggregateEtfProfile({
      symbol: normalizedSymbol,
      benchmark,
      period,
    })
    setCached(cacheKey, profile)
    return profile
  } catch {
    return createEmptyProfile(normalizedSymbol, benchmark, period, true)
  }
})
