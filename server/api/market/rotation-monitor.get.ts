/**
 * Market Rotation Monitor API
 *
 * GET /api/market/rotation-monitor?scope=sectors
 *
 * Returns the full dashboard payload for the Market Rotation Monitor page:
 *   - summary cards (market state, breadth, above-MA ratios, average RSI)
 *   - current market summary (deterministic template text, includes beta suggestion)
 *   - snapshot-backed rows with comparison deltas
 *   - top improving / bottom weakening rows
 *   - data-quality metadata
 *   - betaAllocation (decideBetaAllocation() output: mode, levels, warnings)
 *
 * Reads from persisted market_rotation_snapshot rows. No live Yahoo calls.
 */

import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { isRankScope } from '~/lib/market-rotation/types'
import type { RankScope } from '~/lib/market-rotation/types'
import { buildMarketRotationMonitorPayload } from '~/lib/market-rotation/monitor'
import { generateMarketSummary } from '~/lib/market-rotation/summary'
import { decideBetaAllocation } from '~/lib/beta-allocation/policy'
import { getComparisonDate } from '~/server/utils/market-rotation-queries'
import {
  getLatestMonitorRows,
  resolveMarketState,
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
    const rankScope: RankScope = scopeRaw
    const { rows, asOfDate } = await getLatestMonitorRows(prisma, rankScope)
    const { rows: sectorSummaryRows } = rankScope === 'sectors'
      ? { rows }
      : await getLatestMonitorRows(prisma, 'sectors')

    if (rows.length === 0) {
      log.warn('No rotation snapshots found', { scope: scopeRaw })
      throw Errors.notFound(`No rotation snapshots found for scope "${scopeRaw}". Run the batch job first.`).toH3Error()
    }

    // Step 2: Resolve market state (from market_breadth_daily regime)
    const marketState = await resolveMarketState(prisma)

    // Step 3: Derive comparison date from the rows we already loaded.
    // getMonitorComparisonDate used to re-query the same rows just to check
    // for non-null rankDelta2W; we read it off `rows` instead and only pay
    // for the qualified-date groupBy when comparison data actually exists.
    const hasComparisonData = rows.some(r => r.rankDelta2W != null)
    let comparisonDate: string | null = null
    if (hasComparisonData) {
      const comparisonDateRaw = await getComparisonDate(prisma, rankScope, 10)
      comparisonDate = comparisonDateRaw ? toDateString(comparisonDateRaw) : null
    }

    const trendSeries = comparisonDate
      ? await getMonitorTrendSeries(prisma, rankScope, new Date(comparisonDate), asOfDate!)
      : new Map()
    const rowsWithTrend = rows.map(row => ({
      ...row,
      twoWeekTrend: trendSeries.get(row.symbol) ?? [],
    }))

    // Step 4: Build the dashboard payload (summary, rows, improving/weakening, dataQuality)
    const payload = buildMarketRotationMonitorPayload({
      asOfDate: toDateString(asOfDate!),
      comparisonDate,
      rankScope,
      marketState,
      rows: rowsWithTrend,
      summaryRows: sectorSummaryRows.length > 0 ? sectorSummaryRows : rowsWithTrend,
    })

    // Step 5: Decide beta allocation via pure function (decideBetaAllocation)
    const betaAllocation = decideBetaAllocation({
      marketState: payload.summary.marketState,
      breadthConfirmation: payload.summary.breadthConfirmation,
      above50dRatio: payload.summary.above50d.ratio,
      averageRsi: payload.summary.averageRsi,
      leadership: {
        topImproving: payload.topImproving.map(row => row.sectorName ?? row.symbol),
        bottomWeakening: payload.bottomWeakening.map(row => row.sectorName ?? row.symbol),
      },
    })

    // Step 6: Generate deterministic current market summary.
    // Pass the already-computed betaAllocation so decideBetaAllocation runs
    // exactly once per request (summary.ts no longer re-invokes it).
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
      beta: betaAllocation,
    })

    return serialize({
      ...payload,
      currentMarketSummary,
      betaAllocation,
    })
  }
  catch (error) {
    handleApiError(error, log)
  }
})
