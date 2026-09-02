import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import { listUserTimelineBySymbol, toTimelineResponseItem } from '~/server/utils/stock-timeline-queries'
import { normalizeStockSymbol, parseSymbolParam } from '~/lib/stocks/symbols'
import { logger } from '~/lib/logger'
import { stockSymbolTimelineResponseSchema, stockSymbolSchema, stockTimelineQuerySchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const rawSymbol = parseSymbolParam(event)
    const symbol = normalizeStockSymbol(stockSymbolSchema.parse(rawSymbol))
    const query = stockTimelineQuerySchema.parse(getQuery(event))
    const records = await listUserTimelineBySymbol(user.id, symbol, query.limit)

    return stockSymbolTimelineResponseSchema.parse({
      stock: {
        symbol,
        name: null,
      },
      records: records.map(toTimelineResponseItem),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
