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
    const diary = await prisma.diary.findUnique({
      where: {
        id: BigInt(id),
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
