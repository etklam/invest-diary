import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  console.log('Fetching diaries...')
  try {
    // Auth guaranteed by server middleware
    const userId = BigInt(event.context.user!.id)

    const diaries = await prisma.diary.findMany({
      where: {
        userId
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        transactions: true,
      },
    })

    console.log('Fetched diaries:', diaries.length, 'for user:', userId)
    return diaries
  } catch (error) {
    console.error('Error fetching diaries:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch diaries'
    })
  }
})
