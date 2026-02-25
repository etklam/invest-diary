/**
 * Delete ETF price alert
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing alert ID',
    })
  }
  if (!/^\d+$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid alert ID',
    })
  }
  const alertId = BigInt(id)

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

  if (alert.userId !== user.id) {
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
