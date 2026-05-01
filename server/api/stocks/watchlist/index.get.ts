import { requireUser } from '~/server/utils/auth'
import { listUserWatchlistItems } from '~/server/utils/stock-timeline-records'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const items = await listUserWatchlistItems(user.id)
  return { items }
})
