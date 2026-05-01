/**
 * Get user's ETF alerts
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const alerts = await prisma.etfAlert.findMany({
    where: { userId: user.id },
    include: {
      etf: true,
    },
    orderBy: { createdAt: 'desc' },
  })

  return alerts.map((alert: any) => ({
    id: alert.id.toString(),
    symbol: alert.etf.symbol,
    name: alert.etf.name,
    type: alert.type,
    threshold: Number(alert.threshold),
    message: alert.message,
    isTriggered: alert.isTriggered,
    triggeredAt: alert.triggeredAt,
    createdAt: alert.createdAt,
  }))
})
