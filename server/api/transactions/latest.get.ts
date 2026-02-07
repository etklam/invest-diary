import prisma from '../../../lib/prisma'

export default defineEventHandler(async (event) => {
  try {
    const latestDiary = await prisma.diary.findFirst({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        transactions: true,
      },
    })

    if (!latestDiary) {
      return null
    }

    return {
      diary_id: latestDiary.id,
      diary_date: latestDiary.createdAt,
      transactions: latestDiary.transactions,
    }
  } catch (error) {
    console.error('Error fetching latest transactions:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch latest transactions',
    })
  }
})
