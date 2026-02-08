import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody(event)

  if (!body.diary_id || !body.message || !body.trigger_at) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }

  try {
    // Verify diary ownership
    const diary = await prisma.diary.findFirst({
      where: {
        id: BigInt(body.diary_id),
        userId: userId
      }
    })

    if (!diary) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Diary not found',
      })
    }

    const alert = await prisma.alert.create({
      data: {
        diaryId: BigInt(body.diary_id),
        message: body.message,
        triggerAt: new Date(body.trigger_at),
      },
    })

    console.log('[API] Alert created:', alert.id, 'for user:', userId)
    return alert
  } catch (error) {
    console.error('Error creating alert:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create alert',
    })
  }
})
