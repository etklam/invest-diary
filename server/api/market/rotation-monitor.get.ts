/**
 * Market Rotation Monitor API
 *
 * GET /api/market/rotation-monitor?scope=sectors
 *
 * Returns the full dashboard payload for the Market Rotation Monitor page:
 *   - summary cards (market state, breadth, above-MA ratios, average RSI)
 *   - current market summary (deterministic template text)
 *   - snapshot-backed rows with comparison deltas
 *   - top improving / bottom weakening rows
 *   - data-quality metadata
 *
 * Reads from persisted market_rotation_snapshot rows. No live Yahoo calls.
 */

import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { isRankScope } from '~/lib/market-rotation/types'
import { buildMarketRotationMonitorPayload } from '~/lib/market-rotation/monitor'
import { generateMarketSummary } from '~/lib/market-rotation/summary'
import {
  getLatestMonitorRows,
  resolveMarketState,
  getMonitorComparisonDate,
  getMonitorTrendSeries,
} from '~/server/utils/market-rotation-monitor-queries'

const VALID_SCOPES = ['sectors', 'indexes', 'core'] as const
const DEFAULT_SCOPE = 'sectors'

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)

  try {
    const query = getQuery(event) || {}
    const scopeRaw = String(query.scope ?? DEFAULT_SCOPE)

    if (!isRankScope(scopeRaw)) {
      throw Errors.validationError([
        { field: 'scope', message: `Must be one of: ${VALID_SCOPES.join(', ')}` },
      ]).toH3Error()
    }

    // Step 1: Load latest monitor rows for the requested scope
    const { rows, asOfDate } = await getLatestMonitorRows(prisma, scopeRaw)
    const { rows: sectorSummaryRows } = scopeRaw === 'sectors'
      ? { rows }
      : await getLatestMonitorRows(prisma, 'sectors')

    if (rows.length === 0) {
      log.warn('No rotation snapshots found', { scope: scopeRaw })
      throw Errors.notFound(`No rotation snapshots found for scope "${scopeRaw}". Run the batch job first.`).toH3Error()
    }

    // Step 2: Resolve market state (from market_breadth_daily regime)
    const marketState = await resolveMarketState(prisma)

    // Step 3: Get comparison date (null if no 2W comparison data)
    const comparisonDate = await getMonitorComparisonDate(prisma, scopeRaw)

    const trendSeries = comparisonDate
      ? await getMonitorTrendSeries(prisma, scopeRaw, new Date(comparisonDate), asOfDate!)
      : new Map()
    const rowsWithTrend = rows.map(row => ({
      ...row,
      twoWeekTrend: trendSeries.get(row.symbol) ?? [],
    }))

    // Step 4: Build the dashboard payload (summary, rows, improving/weakening, dataQuality)
    const payload = buildMarketRotationMonitorPayload({
      asOfDate: toDateString(asOfDate!),
      comparisonDate,
      rankScope: scopeRaw,
      marketState,
      rows: rowsWithTrend,
      summaryRows: sectorSummaryRows.length > 0 ? sectorSummaryRows : rowsWithTrend,
    })

    // Step 5: Generate deterministic current market summary
    const currentMarketSummary = generateMarketSummary({
      marketState: payload.summary.marketState,
      breadthCondition: payload.summary.breadthCondition,
      breadthConfirmation: payload.summary.breadthConfirmation,
      topImproving: payload.topImproving.map(row => ({
        symbol: row.symbol,
        sectorName: row.sectorName,
      })),
      bottomWeakening: payload.bottomWeakening.map(row => ({
        symbol: row.symbol,
        sectorName: row.sectorName,
      })),
      above50dRatio: payload.summary.above50d.ratio,
      averageRsi: payload.summary.averageRsi,
    })

    return serialize({
      ...payload,
      currentMarketSummary,
    })
  }
  catch (error) {
    handleApiError(error, log)
  }
})
