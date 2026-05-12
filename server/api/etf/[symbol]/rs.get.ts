import { fetchMonthlyData } from '~/lib/yahoo-finance'
import { computeRelativeStrength } from '~/lib/etf-profile/calculators/rs'
import { createEmptyRs } from '~/lib/etf-profile/defaults'
import type { RsMetrics } from '~/lib/etf-profile/types'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

const VALID_BENCHMARKS: RsMetrics['benchmark'][] = ['SPY', 'QQQ']
const VALID_PERIODS: RsMetrics['period'][] = ['1m', '3m', '6m', '1y']

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
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

  try {
    const [symbolData, benchmarkData] = await Promise.all([
      fetchMonthlyData(symbol.toUpperCase(), 1),
      fetchMonthlyData(benchmark, 1),
    ])

    const symbolSeries = symbolData.map(row => ({ close: row.adjClose ?? row.close ?? 0 }))
    const benchmarkSeries = benchmarkData.map(row => ({ close: row.adjClose ?? row.close ?? 0 }))
    const rs = computeRelativeStrength(symbolSeries, benchmarkSeries, period)

    return {
      benchmark,
      period,
      ...rs,
      asOf: new Date().toISOString(),
    }
  } catch {
    return createEmptyRs(benchmark, period)
  }
})
