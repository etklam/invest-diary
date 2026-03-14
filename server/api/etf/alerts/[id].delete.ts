/**
 * Delete ETF price alert
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const alertId = parsePositiveBigIntParam(event, 'id')

  // Check if alert exists and belongs to user
  const alert = await prisma.etfAlert.findUnique({
    where: { id: alertId },
  })

  if (!alert) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Alert not found',
    })
  }

  if (String(alert.userId) !== String(user.id)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  // Delete alert
  await prisma.etfAlert.delete({
    where: { id: alertId },
  })

  return { success: true }
})
