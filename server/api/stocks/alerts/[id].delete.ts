/**
 * Delete stock price alert
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const alertId = parsePositiveBigIntParam(event, 'id')

  // Check if alert exists and belongs to user
  const alert = await prisma.priceAlert.findUnique({
    where: { id: alertId },
  })

  if (!alert) {
    throw Errors.alertNotFound(alertId.toString()).toH3Error()
  }

  if (String(alert.userId) !== String(user.id)) {
    throw Errors.forbidden().toH3Error()
  }

  // Delete alert
  await prisma.priceAlert.delete({
    where: { id: alertId },
  })

  return { success: true }
})
