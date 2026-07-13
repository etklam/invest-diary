import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { calculateHoldings } from '~/lib/position-state'
import { requireUser } from '~/server/utils/auth'
import { readPortfolioTransactions } from '~/server/utils/transaction-read'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const transactions = await readPortfolioTransactions(BigInt(user.id))

    // 計算持股（已經排序好，不需要在 calculateHoldings 中再排序）
    const holdings = calculateHoldings(transactions)

    log.debug('Calculated holdings', {
      userId: user.id,
      symbolCount: holdings.length,
    })
    return holdings
  } catch (error) {
    handleApiError(error, log)
  }
})
