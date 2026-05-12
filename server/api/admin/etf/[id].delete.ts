/**
 * Admin: Delete ETF
 * Cascade deletes all related prices, alerts, and watchlist entries
 */

import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)
  requireUser(event)
  await adminMiddleware(event)

  const etfId = parsePositiveBigIntParam(event, 'id')

  // Check if ETF exists
  const etf = await prisma.etf.findUnique({
    where: { id: etfId },
    include: {
      _count: {
        select: {
          prices: true,
          alerts: true,
          watchlists: true,
        },
      },
    },
  })

  if (!etf) {
    throw Errors.etfNotFound(etfId.toString()).toH3Error()
  }

  // Delete ETF (cascade will handle related records)
  await prisma.etf.delete({
    where: { id: etfId },
  })

  return {
    success: true,
    deletedPrices: etf._count.prices,
    deletedAlerts: etf._count.alerts,
    deletedWatchlists: etf._count.watchlists,
  }
})
