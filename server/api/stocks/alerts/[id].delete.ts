/**
 * Delete stock price alert
 */

import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { deletePriceAlert } from '~/server/utils/price-alert-queries'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const alertId = parsePositiveBigIntParam(event, 'id')
    await deletePriceAlert(alertId, BigInt(user.id))

    return { success: true }
  } catch (error) {
    const { handleApiError } = await import('~/server/utils/error-handler')
    return handleApiError(error, log)
  }
})
