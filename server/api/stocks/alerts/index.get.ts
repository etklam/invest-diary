/**
 * Get user's stock price alerts
 */

import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { serialize } from '~/server/utils/serialize'
import { listPriceAlerts } from '~/server/utils/price-alert-queries'

type PriceAlertRow = Awaited<ReturnType<typeof listPriceAlerts>>[number]

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const alerts = await listPriceAlerts(BigInt(user.id))

    return serialize(alerts.map((alert: PriceAlertRow) => ({
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
  } catch (error) {
    const { handleApiError } = await import('~/server/utils/error-handler')
    return handleApiError(error, log)
  }
})
