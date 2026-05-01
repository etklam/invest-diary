import { fetchMonthlyData } from '~/lib/yahoo-finance'
import { computeRiskMetrics } from '~/lib/etf-profile/calculators/risk'
import { EMPTY_RISK_METRICS } from '~/lib/etf-profile/defaults'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing symbol',
    })
  }

  try {
    const data = await fetchMonthlyData(symbol.toUpperCase(), 5)
    const series = data.map(row => ({
      close: row.adjClose ?? row.close ?? 0,
      volume: row.volume,
    }))

    return {
      ...computeRiskMetrics(series),
      asOf: new Date().toISOString(),
    }
  } catch {
    return {
      ...EMPTY_RISK_METRICS,
      asOf: null,
    }
  }
})
