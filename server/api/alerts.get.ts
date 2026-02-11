import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  // Check if user is authenticated
  if (!event.context.user) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const userId = BigInt(event.context.user.id)

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
