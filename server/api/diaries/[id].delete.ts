import prisma from '../../../lib/prisma'

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
    // First verify ownership
    const diary = await prisma.diary.findFirst({
      where: {
        id: BigInt(id),
        userId: userId
      }
    })

    if (!diary) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Diary not found',
      })
    }

    await prisma.diary.delete({
      where: {
        id: BigInt(id),
      },
    })

    console.log('[API] Diary deleted:', id, 'for user:', userId)
    return { success: true }
  } catch (error) {
    console.error('Error deleting diary:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete diary',
    })
  }
})
