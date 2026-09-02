import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { upsertStockWatchlistItem } from '~/server/utils/stock-watchlist-queries'
import { handleApiError } from '~/server/utils/error-handler'
import { stockWatchlistMutationResponseSchema, stockWatchlistCreateRequestSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const body = await readBody(event)
    const payload = stockWatchlistCreateRequestSchema.parse(body)

    const item = await upsertStockWatchlistItem({
      userId: user.id,
      symbol: payload.symbol,
      status: 'WATCHING',
    })

    return stockWatchlistMutationResponseSchema.parse({
      id: String(item.id),
      symbol: item.stock.symbol,
      sortOrder: item.sortOrder,
      status: item.status,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
