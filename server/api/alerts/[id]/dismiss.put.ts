import prisma from '../../../../lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const alertId = parsePositiveBigIntParam(event, 'id')

  try {
    // Verify ownership via diary relation
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        diary: {
          userId: userId
        }
      }
    })

    if (!alert) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Alert not found',
      })
    }

    const updatedAlert = await prisma.alert.update({
      where: {
        id: alertId,
      },
      data: {
        isDismissed: true,
      },
    })

    console.log('[API] Alert dismissed:', alertId.toString(), 'for user:', userId)
    return updatedAlert
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('Error dismissing alert:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to dismiss alert',
    })
  }
})
