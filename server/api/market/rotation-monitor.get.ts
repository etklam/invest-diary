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
 *
 * Reads from persisted market_rotation_snapshot rows. No live Yahoo calls.
 */

import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { isRankScope, rankScopes } from '~/lib/market-rotation/types'
import { getRotationDashboardContext } from '~/server/utils/market-rotation-monitor-queries'

const DEFAULT_SCOPE = 'sectors'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)

  try {
    const query = getQuery(event) || {}
    const scopeRaw = String(query.scope ?? DEFAULT_SCOPE)

    if (!isRankScope(scopeRaw)) {
      throw Errors.validationError([
        { field: 'scope', message: `Must be one of: ${rankScopes.join(', ')}` },
      ]).toH3Error()
    }

    const context = await getRotationDashboardContext(prisma, { scope: scopeRaw })

    if (!context.payload) {
      log.warn('No rotation snapshots found', { scope: scopeRaw })
      throw Errors.notFound(`No rotation snapshots found for scope "${scopeRaw}". Run the batch job first.`).toH3Error()
    }

    return serialize(context.payload)
  }
  catch (error) {
    handleApiError(error, log)
  }
})
