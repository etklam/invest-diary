import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  try {
    const alerts = await prisma.alert.findMany({
      where: {
        diary: {
          userId: userId
        },
        isDismissed: false
      },
      include: {
        diary: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        triggerAt: 'asc'
      }
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
