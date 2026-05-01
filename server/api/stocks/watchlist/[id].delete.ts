import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { updateStockWatchlistItem } from '~/server/utils/stock-timeline-records'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

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
      throw createError({
        statusCode: 404,
        statusMessage: 'Watchlist item not found',
      })
    }

    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
