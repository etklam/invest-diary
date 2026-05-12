import { aggregateEtfProfile } from '~/lib/etf-profile/aggregator'
import { createEmptyProfile } from '~/lib/etf-profile/defaults'
import { getCached, setCached } from '~/lib/etf-profile/cache'
import type { RsMetrics } from '~/lib/etf-profile/types'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw Errors.validationError([{ field: 'symbol', message: 'Missing symbol' }]).toH3Error()
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
