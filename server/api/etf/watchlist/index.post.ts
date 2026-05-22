/**
 * Add ETF to user's watchlist
 */

import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { addEtfToWatchlist } from '~/server/utils/etf-watchlist-queries'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const body = await readBody(event)
  const { symbol } = body

  if (!symbol || typeof symbol !== 'string') {
    throw Errors.validationError([{ field: 'symbol', message: 'Symbol is required' }]).toH3Error()
  }

  try {
    const normalizedSymbol = symbol.toUpperCase().trim()

    const watchlistItem = await addEtfToWatchlist(user.id, normalizedSymbol)

    log.info('Added ETF to watchlist', {
      userId: user.id,
      symbol: normalizedSymbol,
      watchlistItemId: String(watchlistItem.id),
    })

    return serialize({
      id: watchlistItem.id,
      symbol: watchlistItem.etf.symbol,
      name: watchlistItem.etf.name,
      sortOrder: watchlistItem.sortOrder,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
