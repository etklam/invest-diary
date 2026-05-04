import { AppError, Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { listUserWatchlist } from '~/server/utils/stock-timeline-records'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, ['AGENT_WRITE'])
    const watchlist = await listUserWatchlist(auth.user.id)

    return { watchlist }
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code })
      throw error.toH3Error()
    }
    if (typeof error === 'object' && error !== null && 'statusCode' in error) {
      throw error
    }
    log.error('Failed to fetch stock watchlist via API key', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
