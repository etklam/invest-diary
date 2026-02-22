import prisma from '~/lib/prisma'
import { calculateHoldings } from '~/lib/utils'

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  console.log('[Stocks] Fetching holdings for user:', userId)
  try {
    //效能優化：直接查詢 transactions 表，避免載入完整的 diary 資料
    //透過 diary 關聯篩選 userId，只選擇計算所需的欄位
    const transactions = await prisma.transaction.findMany({
      where: {
        diary: {
          userId: BigInt(userId)
        }
      },
      select: {
        id: true,
        symbol: true,
        type: true,
        quantity: true,
        price: true,
        tradeDate: true,
        // 不需要載入 diaryId 和 createdAt
      },
      orderBy: {
        tradeDate: 'asc'// 按日期排序，方便 FIFO 計算
      }
    })

    // 計算持股（已經排序好，不需要在 calculateHoldings 中再排序）
    const holdings = calculateHoldings(transactions)

    console.log('[Stocks] Calculated holdings:', holdings.length, 'symbols')
    return holdings
  } catch (error) {
    console.error('[Stocks] Error fetching holdings:', error)
    console.error('[Stocks] Error details:', JSON.stringify(error))
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch holdings',
    })
  }
})
