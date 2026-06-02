import { readEtfResearch } from '~/lib/etf-profile/research'
import { shouldBypassCache } from '~/lib/etf-profile/cache'
import type { RsMetrics } from '~/lib/etf-profile/types'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw Errors.validationError([{ field: 'symbol', message: 'Missing symbol' }]).toH3Error()
  }

  const benchmark: RsMetrics['benchmark'] = 'SPY'
  const period: RsMetrics['period'] = '3m'
  const query = getQuery(event) || {}
  const profile = await readEtfResearch({
    symbol: symbol.trim().toUpperCase(),
    benchmark,
    period,
    bypassCache: shouldBypassCache(query.nocache),
  })

  return {
    ...profile.risk,
    asOf: profile.meta.asOf,
    meta: profile.meta,
  }
})
