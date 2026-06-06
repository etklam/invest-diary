import { readEtfResearch } from '~/lib/etf-profile/research'
import { shouldBypassCache } from '~/lib/market-data/cache'
import type { RsMetrics } from '~/lib/etf-profile/types'
import { Errors } from '~/lib/errors/factory'

const VALID_BENCHMARKS: RsMetrics['benchmark'][] = ['SPY', 'QQQ']
const VALID_PERIODS: RsMetrics['period'][] = ['1m', '3m', '6m', '1y']

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw Errors.validationError([{ field: 'symbol', message: 'Missing symbol' }]).toH3Error()
  }

  const query = getQuery(event)
  const rawBenchmark = typeof query.benchmark === 'string' ? query.benchmark.toUpperCase() : 'SPY'
  const rawPeriod = typeof query.period === 'string' ? query.period : '3m'

  if (!VALID_BENCHMARKS.includes(rawBenchmark as RsMetrics['benchmark'])) {
    throw Errors.validationError([{ field: 'benchmark', message: 'Invalid benchmark' }]).toH3Error()
  }

  if (!VALID_PERIODS.includes(rawPeriod as RsMetrics['period'])) {
    throw Errors.validationError([{ field: 'period', message: 'Invalid period' }]).toH3Error()
  }

  const benchmark = rawBenchmark as RsMetrics['benchmark']
  const period = rawPeriod as RsMetrics['period']

  const profile = await readEtfResearch({
    symbol: symbol.trim().toUpperCase(),
    benchmark,
    period,
    bypassCache: shouldBypassCache(query.nocache),
  })

  return {
    ...profile.rs,
    asOf: profile.meta.asOf,
    meta: profile.meta,
  }
})
