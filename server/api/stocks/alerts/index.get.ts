/**
 * Get user's stock price alerts
 */

import type { PriceAlert } from '@prisma/client'
import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const alerts = await prisma.priceAlert.findMany({
    where: { userId: user.id },
    orderBy: { createdAt: 'desc' },
  })

  return serialize(alerts.map((alert: PriceAlert) => ({
    id: alert.id,
    symbol: alert.symbol,
    type: alert.type,
    threshold: Number(alert.threshold),
    message: alert.message,
    isTriggered: alert.isTriggered,
    triggeredAt: alert.triggeredAt,
    createdAt: alert.createdAt,
    updatedAt: alert.updatedAt,
  })))
})
