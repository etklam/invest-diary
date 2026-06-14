/**
 * Admin: Trigger Market Rotation batch job
 *
 * POST /api/admin/market/rotation-batch
 * Body: { scope?: 'sectors' | 'indexes' | 'core' | 'all' }  (default: 'all')
 *
 * Fetches canonical prices (if stale), runs the pipeline, and persists
 * rotation snapshots to market_rotation_snapshot.
 */

import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { runScopeBatch, runFullBatch } from '~/server/utils/market-rotation-batch'

const VALID_SCOPES = ['sectors', 'indexes', 'core', 'all'] as const

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)
  requireUser(event)
  await adminMiddleware(event)

  try {
    const body = await readBody(event).catch(() => ({}))
    const scope = String(body?.scope ?? 'all')

    if (!VALID_SCOPES.includes(scope as typeof VALID_SCOPES[number])) {
      throw new Error(`Invalid scope. Must be one of: ${VALID_SCOPES.join(', ')}`)
    }

    log.info('Starting market rotation batch', { scope })

    if (scope === 'all') {
      const result = await runFullBatch(prisma)
      log.info('Market rotation batch complete', {
        totalUpserted: result.totalUpserted,
        totalErrors: result.totalErrors,
      })
      return {
        success: true,
        ...result,
      }
    }

    const result = await runScopeBatch(prisma, scope as 'sectors' | 'indexes' | 'core')
    log.info('Market rotation batch complete', {
      scope: result.rankScope,
      upserted: result.upsertedCount,
      errors: result.errors.length,
    })

    return {
      success: true,
      result,
    }
  }
  catch (error) {
    handleApiError(error, log)
  }
})
