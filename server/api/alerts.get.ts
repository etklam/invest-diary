import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const alerts = await prisma.alert.findMany({
      where: {
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
      statusMessage: 'Failed to fetch alerts',
    })
  }
})
