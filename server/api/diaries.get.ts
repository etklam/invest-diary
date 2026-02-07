import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const diaries = await prisma.diary.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        transactions: true,
      },
    })

    return diaries
  } catch (error) {
    console.error('Error fetching diaries:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch diaries',
    })
  }
})
