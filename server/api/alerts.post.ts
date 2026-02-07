import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  const body = await readBody(event)

  if (!body.diary_id || !body.message || !body.trigger_at) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing required fields',
    })
  }

  try {
    const alert = await prisma.alert.create({
      data: {
        diaryId: BigInt(body.diary_id),
        message: body.message,
        triggerAt: new Date(body.trigger_at),
      },
    })

    return alert
  } catch (error) {
    console.error('Error creating alert:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create alert',
    })
  }
})
