import { aggregateEtfProfile } from '~/lib/etf-profile/aggregator'
import { EMPTY_VALUATION_METRICS } from '~/lib/etf-profile/defaults'
import type { RsMetrics } from '~/lib/etf-profile/types'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw Errors.validationError([{ field: 'symbol', message: 'Missing symbol' }]).toH3Error()
  }

  const benchmark: RsMetrics['benchmark'] = 'SPY'
  const period: RsMetrics['period'] = '3m'

  try {
    const profile = await aggregateEtfProfile({
      symbol: symbol.toUpperCase(),
      benchmark,
      period,
    })

    return {
      ...profile.valuation,
      meta: profile.meta,
    }
  } catch {
    return {
      ...EMPTY_VALUATION_METRICS,
      meta: {
        asOf: null,
        fetchedAt: new Date().toISOString(),
        isStale: true,
        sources: {},
      },
    }
  }
})
