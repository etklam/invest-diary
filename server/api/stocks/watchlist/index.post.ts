import { z } from 'zod'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { upsertStockWatchlistItem } from '~/server/utils/stock-watchlist-queries'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

const requestSchema = z.object({
  symbol: z.string().min(1).max(32).transform(normalizeStockSymbol),
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const body = await readBody(event)
    const payload = requestSchema.parse(body)

    const item = await upsertStockWatchlistItem({
      userId: user.id,
      symbol: payload.symbol,
      status: 'WATCHING',
    })

    return serialize({
      id: item.id,
      symbol: item.stock.symbol,
      sortOrder: item.sortOrder,
      status: item.status,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
