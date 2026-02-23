import prisma from '../../lib/prisma'
import type { DiariesApiResponse } from '~/types/diary'

export default defineEventHandler(async (event): DiariesApiResponse => {
  console.log('[Diaries] Fetching diaries with pagination...')
  try {
    // Auth guaranteed by server middleware
    // 確保 userId 為 BigInt（避免 string/number 混用）
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
          alerts: {
            where: { isDismissed: false },
            select: {
              id: true,
              message: true,
              triggerAt: true,
              isDismissed: true
            }
          },
          transactions: {
            select: {
              id: true,
              symbol: true,
              type: true,
              quantity: true,
              price: true,
              tradeDate: true,
            }
          }
        },
        skip,
        take: limit,
      }),
      prisma.diary.count({ where: { userId } })
    ])

    // 將 BigInt 轉為 string，避免本機 Nitro JSON 序列化 500 error
    const safeDiaries = diaries.map((d) => ({
      ...d,
      id: d.id.toString(),
      alerts: d.alerts?.map((a) => ({ ...a, id: a.id.toString() })),
      transactions: d.transactions?.map((t) => ({
        ...t,
        id: t.id.toString(),
      })),
    }))

    return {
      data: safeDiaries,
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
