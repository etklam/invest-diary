import { z } from 'zod'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { updateStockWatchlistItem } from '~/server/utils/stock-timeline-records'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { Errors } from '~/lib/errors/factory'

const requestSchema = z.object({
  status: z.enum(['WATCHING', 'ARCHIVED']).optional(),
  sortOrder: z.number().int().min(0).max(10000).optional(),
}).refine((value) => value.status !== undefined || value.sortOrder !== undefined, {
  message: 'status or sortOrder is required',
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const watchlistId = parsePositiveBigIntParam(event, 'id')
    const payload = requestSchema.parse(await readBody(event))
    const item = await updateStockWatchlistItem({
      userId: user.id,
      watchlistId,
      status: payload.status,
      sortOrder: payload.sortOrder,
    })

    if (!item) {
      throw Errors.notFound('Watchlist item not found').toH3Error()
    }

    return {
      id: item.id.toString(),
      symbol: item.stock.symbol,
      sortOrder: item.sortOrder,
      status: item.status,
      updatedAt: item.updatedAt.toISOString(),
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
