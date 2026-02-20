import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const rawUserId = event.context.user?.id

  if (!rawUserId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  // Defensive ID resolution (params may be undefined in some dev/PWA cases)
  const rawFromParams = event.context?.params?.id
  const rawFromRouter = getRouterParam(event, 'id')
  const rawFromPath = event.path?.split('/').filter(Boolean).pop()

  const rawId = rawFromParams ?? rawFromRouter ?? rawFromPath

  if (!rawId) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID is required',
    })
  }

  const id = String(rawId)

  if (!/^[0-9]+$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid ID format',
    })
  }

  try {
    const diary = await prisma.diary.findFirst({
      where: {
        id: BigInt(id),
        userId: typeof rawUserId === 'string' ? BigInt(rawUserId) : rawUserId
      },
      include: {
        transactions: true,
        alerts: true,
      },
    })

    if (!diary) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Diary not found',
      })
    }

    return diary
  } catch (error) {
    console.error('Error fetching diary:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch diary',
    })
  }
})
