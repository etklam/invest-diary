/**
 * Update an owned stock price alert.
 */

import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { toPriceAlertResponse } from '~/lib/contracts/alerts'
import { updatePriceAlert } from '~/server/utils/price-alert-queries'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const alertId = parsePositiveBigIntParam(event, 'id')
    const updated = await updatePriceAlert(alertId, BigInt(user.id), await readBody(event))
    return toPriceAlertResponse(updated)
  } catch (error) {
    handleApiError(error, log)
  }
})
