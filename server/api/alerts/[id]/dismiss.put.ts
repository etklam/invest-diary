import prisma from '../../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID is required',
    })
  }

  try {
    // Verify ownership via diary relation
    const alert = await prisma.alert.findFirst({
      where: {
        id: BigInt(id),
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
        id: BigInt(id),
      },
      data: {
        isDismissed: true,
      },
    })

    console.log('[API] Alert dismissed:', id, 'for user:', userId)
    return updatedAlert
  } catch (error) {
    console.error('Error dismissing alert:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to dismiss alert',
    })
  }
})
