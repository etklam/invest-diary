/**
 * Portfolio Exposure API
 *
 * GET /api/stocks/exposure
 *
 * Combines:
 *   - user holdings (from transactions → calculateHoldings)
 *   - market rotation snapshot (optional, for marketState + betaAllocation)
 *
 * Returns current portfolio exposure vs suggested beta allocation.
 * Never throws when rotation data is missing — returns `marketState: 'unknown'`
 * with empty gaps + fallback explanation so the UI stays functional.
 */

import prisma from '~/lib/prisma'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { calculateHoldings } from '~/lib/position-state'
import { readPortfolioTransactions } from '~/server/utils/transaction-read'
import type { HoldingView } from '~/lib/stocks-view'
import {
  computePortfolioExposure,
  compareExposureToTarget,
  type PortfolioExposure,
  type ExposureGap,
  type SuggestedAllocation,
} from '~/lib/portfolio-exposure/exposure'
import { decideBetaAllocation, type BetaAllocationResult } from '~/lib/beta-allocation/policy'
import type { MarketState } from '~/lib/market-rotation/state'
import { buildMarketRotationMonitorPayload } from '~/lib/market-rotation/monitor'
import {
  getLatestMonitorRows,
  resolveMarketState,
} from '~/server/utils/market-rotation-monitor-queries'

const NO_MARKET_DATA_EXPLANATION =
  'Market regime unclear. No market regime data available. Showing current exposure only.'

const FALLBACK_ALLOCATION: SuggestedAllocation = {
  highBetaTargetPct: 0,
  coreIndexTargetPct: 50,
  cashTargetPct: 50,
}

const FALLBACK_BETA_ALLOCATION: BetaAllocationResult = {
  suggestedMode: 'unknown',
  suggestedBetaLevel: null,
  highBetaTargetPct: 0,
  coreIndexTargetPct: 50,
  cashTargetPct: 50,
  explanation: NO_MARKET_DATA_EXPLANATION,
  warnings: [],
}

interface ExposureResponse {
  exposure: PortfolioExposure
  gaps: ExposureGap[]
  suggestedAllocation: SuggestedAllocation
  betaAllocation: BetaAllocationResult
  marketState: MarketState
  lastUpdated: string | null
}

function toHoldingView(h: { symbol: string; quantity: number; avgCost: number; totalCost: number }): HoldingView {
  // No live quote in this pipeline; marketValue falls back to totalCost
  return {
    symbol: h.symbol,
    quantity: h.quantity,
    avgCost: h.avgCost,
    totalCost: h.totalCost,
    price: undefined,
    dayChange: undefined,
    dayChangePercent: undefined,
    marketValue: null,
    unrealizedAmount: null,
    unrealizedPct: null,
    concentrationPct: 0,
    dayChangeAmount: null,
  }
}

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    // ── Step 1: Holdings ────────────────────────────────────────────
    const transactions = await readPortfolioTransactions(BigInt(user.id))

    const rawHoldings = calculateHoldings(transactions)
    const holdings: HoldingView[] = rawHoldings.map(toHoldingView)

    log.debug('Loaded holdings for exposure', {
      userId: String(user.id),
      symbolCount: holdings.length,
    })

    const exposure = computePortfolioExposure(holdings)

    // ── Step 2: Rotation snapshot (best-effort, never blocks) ───────
    let marketState: MarketState = 'unknown'
    let suggestedAllocation: SuggestedAllocation = FALLBACK_ALLOCATION
    let betaAllocation: BetaAllocationResult = FALLBACK_BETA_ALLOCATION
    let lastUpdated: string | null = null

    try {
      const { rows, asOfDate } = await getLatestMonitorRows(prisma, 'sectors')

      if (rows.length > 0 && asOfDate) {
        const resolvedState = await resolveMarketState(prisma)
        const payload = buildMarketRotationMonitorPayload({
          asOfDate: asOfDate.toISOString().slice(0, 10),
          comparisonDate: null,
          rankScope: 'sectors',
          marketState: resolvedState,
          rows,
        })

        const decided = decideBetaAllocation({
          marketState: payload.summary.marketState,
          breadthConfirmation: payload.summary.breadthConfirmation,
          above50dRatio: payload.summary.above50d.ratio,
          averageRsi: payload.summary.averageRsi,
          leadership: {
            topImproving: payload.topImproving.map(row => row.sectorName ?? row.symbol),
            bottomWeakening: payload.bottomWeakening.map(row => row.sectorName ?? row.symbol),
          },
        })

        marketState = payload.summary.marketState
        suggestedAllocation = {
          highBetaTargetPct: decided.highBetaTargetPct,
          coreIndexTargetPct: decided.coreIndexTargetPct,
          cashTargetPct: decided.cashTargetPct,
        }
        betaAllocation = decided
        lastUpdated = asOfDate.toISOString()
      } else {
        log.warn('No rotation snapshots found; returning exposure-only payload', {
          userId: String(user.id),
        })
      }
    } catch (rotationError) {
      // Rotation pipeline failure must NOT block the exposure response.
      log.warn('Rotation snapshot resolution failed; falling back', {
        userId: String(user.id),
        error: rotationError instanceof Error ? rotationError.message : String(rotationError),
      })
    }

    // ── Step 3: Compare exposure vs suggested ───────────────────────
    const gaps = marketState === 'unknown'
      ? []
      : compareExposureToTarget(exposure, suggestedAllocation)

    const response: ExposureResponse = {
      exposure,
      gaps,
      suggestedAllocation,
      betaAllocation,
      marketState,
      lastUpdated,
    }

    return serialize(response)
  } catch (error) {
    handleApiError(error, log)
  }
})
