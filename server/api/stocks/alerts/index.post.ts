/**
 * Create stock price alert
 */

import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { createPriceAlert } from '~/server/utils/price-alert-queries'
import { toPriceAlertResponse } from '~/lib/contracts/alerts'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const body = await readBody(event)
    const alert = await createPriceAlert(BigInt(user.id), body)

    return toPriceAlertResponse(alert)
  } catch (error) {
    handleApiError(error, log)
  }
})
