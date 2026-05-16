import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { updateStockWatchlistItem } from '~/server/utils/stock-watchlist-queries'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const watchlistId = parsePositiveBigIntParam(event, 'id')
    const item = await updateStockWatchlistItem({
      userId: user.id,
      watchlistId,
      status: 'ARCHIVED',
    })

    if (!item) {
      throw Errors.notFound('Watchlist item not found').toH3Error()
    }

    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
