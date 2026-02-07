import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  console.log('Fetching diaries...')
  try {
    const diaries = await prisma.diary.findMany({
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        transactions: true,
      },
    })

    console.log('Fetched diaries:', diaries)
    return diaries
  } catch (error) {
    console.error('Error fetching diaries:', error)
    console.error('Error details:', JSON.stringify(error))
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch diaries',
    })
  }
})
