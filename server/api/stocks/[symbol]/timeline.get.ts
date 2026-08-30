import { z } from 'zod'
import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import { listUserTimelineBySymbol, toTimelineResponseItem } from '~/server/utils/stock-timeline-queries'
import { normalizeStockSymbol, parseSymbolParam, symbolSchema } from '~/lib/stocks/symbols'
import { logger } from '~/lib/logger'

const querySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(100),
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const rawSymbol = parseSymbolParam(event)
    const symbol = normalizeStockSymbol(symbolSchema.parse(rawSymbol))
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
