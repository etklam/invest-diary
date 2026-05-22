/**
 * Remove ETF from user's watchlist
 */

import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { removeEtfFromWatchlist } from '~/server/utils/etf-watchlist-queries'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const watchlistId = parsePositiveBigIntParam(event, 'id')

  try {
    await removeEtfFromWatchlist(watchlistId, user.id)
    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
