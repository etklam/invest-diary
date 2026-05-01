import { z } from 'zod'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import { listUserTimelineBySymbol, toTimelineResponseItem } from '~/server/utils/stock-timeline-records'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { logger } from '~/lib/logger'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const rawSymbol = event.context.params?.symbol
    if (!rawSymbol) {
      throw Errors.validationError([{ field: 'symbol', message: 'symbol is required' }]).toH3Error()
    }

    const symbol = normalizeStockSymbol(rawSymbol)
    const query = querySchema.parse(getQuery(event))
    const records = await listUserTimelineBySymbol(user.id, symbol, query.limit)

    return {
      stock: {
        symbol,
        name: null,
      },
      records: records.map(toTimelineResponseItem),
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
