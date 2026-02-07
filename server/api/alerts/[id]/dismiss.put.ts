import prisma from '../../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID is required',
    })
  }

  try {
    const alert = await prisma.alert.update({
      where: {
        id: BigInt(id),
      },
      data: {
        isDismissed: true,
      },
    })

    return alert
  } catch (error) {
    console.error('Error dismissing alert:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to dismiss alert',
    })
  }
})
