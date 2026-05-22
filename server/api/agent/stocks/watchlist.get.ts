import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { listUserWatchlist } from '~/server/utils/stock-watchlist-queries'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, ['AGENT_WRITE'])
    const watchlist = await listUserWatchlist(auth.user.id)

    return serialize({ watchlist })
  } catch (error) {
    handleApiError(error, log)
  }
})
