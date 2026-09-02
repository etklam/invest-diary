/**
 * Get user's stock price alerts
 */

import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { listPriceAlerts } from '~/server/utils/price-alert-queries'
import { priceAlertListResponseSchema, toPriceAlertResponse } from '~/lib/contracts/alerts'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const alerts = await listPriceAlerts(BigInt(user.id))

    return priceAlertListResponseSchema.parse(alerts.map(toPriceAlertResponse))
  } catch (error) {
    const { handleApiError } = await import('~/server/utils/error-handler')
    return handleApiError(error, log)
  }
})
