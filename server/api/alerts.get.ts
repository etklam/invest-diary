import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  // Check if user is authenticated
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const rawUserId = event.context.user.id
  const userId = typeof rawUserId === 'string' ? BigInt(rawUserId) : rawUserId

  try {
    const alerts = await prisma.alert.findMany({
      where: {
        diary: {
          userId: userId
        },
        isDismissed: false,
        triggerAt: {
          lte: new Date(),
        },
      },
      orderBy: {
        triggerAt: 'asc',
      },
      include: {
        diary: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    })

    return alerts
  } catch (error) {
    console.error('Error fetching alerts:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch alerts'
    })
  }
})
