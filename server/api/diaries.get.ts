import prisma from '../../lib/prisma'

export default defineEventHandler(async (event) => {
  console.log('[Diaries] Fetching diaries with pagination...')
  try {
    // Auth guaranteed by server middleware
    const userId = BigInt(event.context.user!.id)

    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const skip = (page - 1) * limit

    //效能優化：使用 select 只選擇必要欄位
    // - transactions 只選擇必要欄位（不需要 diaryId, createdAt）
    // - diary 不載入完整 content（列表頁不需要）
    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          // content 通常很大，列表頁不載入
          date: true,
          createdAt: true,
          updatedAt: true,
          transactions: {
            select: {
              id: true,
              symbol: true,
              type: true,
              quantity: true,
              price: true,
              tradeDate: true,
              // 不需要 diaryId 和 createdAt
            }
          }
        },
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
    console.error('[Diaries] Error fetching diaries:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch diaries'
    })
  }
})
