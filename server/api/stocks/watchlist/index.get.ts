import { requireUser } from '~/server/utils/auth'
import { listUserWatchlistItems } from '~/server/utils/stock-timeline-records'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const items = await listUserWatchlistItems(user.id)
  return { items }
})
