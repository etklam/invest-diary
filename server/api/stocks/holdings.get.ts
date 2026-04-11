import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { calculateHoldings } from '~/lib/utils'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    //效能優化：直接查詢 transactions 表，避免載入完整的 diary 資料
    //透過 diary 關聯篩選 userId，只選擇計算所需的欄位
    const transactions = await prisma.transaction.findMany({
      where: {
        diary: {
          userId: BigInt(user.id)
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
        tradeDate: 'asc'// 按日期排序，方便平均成本計算
      }
    })

    // 計算持股（已經排序好，不需要在 calculateHoldings 中再排序）
    const holdings = calculateHoldings(transactions)

    log.debug('Calculated holdings', {
      userId: user.id,
      symbolCount: holdings.length,
    })
    return holdings
  } catch (error) {
    log.error('Failed to fetch holdings', {
      userId: user.id,
      error,
    })
    throw Errors.internalError(error).toH3Error()
  }
})
