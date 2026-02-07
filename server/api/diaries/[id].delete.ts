import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID is required',
    })
  }

  try {
    await prisma.diary.delete({
      where: {
        id: BigInt(id),
      },
    })

    return { success: true }
  } catch (error) {
    console.error('Error deleting diary:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete diary',
    })
  }
})
