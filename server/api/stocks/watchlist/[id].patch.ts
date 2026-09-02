import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { updateStockWatchlistItem } from '~/server/utils/stock-watchlist-queries'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { Errors } from '~/lib/errors/factory'
import { stockWatchlistMutationResponseSchema, stockWatchlistUpdateRequestSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const watchlistId = parsePositiveBigIntParam(event, 'id')
    const payload = stockWatchlistUpdateRequestSchema.parse(await readBody(event))
    const item = await updateStockWatchlistItem({
      userId: user.id,
      watchlistId,
      status: payload.status,
      sortOrder: payload.sortOrder,
    })

    if (!item) {
      throw Errors.watchlistItemNotFound(String(watchlistId)).toH3Error()
    }

    return stockWatchlistMutationResponseSchema.parse({
      id: String(item.id),
      symbol: item.stock.symbol,
      sortOrder: item.sortOrder,
      status: item.status,
      updatedAt: item.updatedAt.toISOString(),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
