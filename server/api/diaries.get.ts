import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  console.log('Fetching diaries with pagination...')
  try {
    // Auth guaranteed by server middleware
    const userId = BigInt(event.context.user!.id)

    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const skip = (page - 1) * limit

    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: { transactions: true },
        skip,
        take: limit,
      }),
      prisma.diary.count({ where: { userId } })
    ])

    return {
      data: diaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('Error fetching diaries:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch diaries'
    })
  }
})
