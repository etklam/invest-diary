import { requireUser } from '~/server/utils/auth'
import { listUserWatchlistItems } from '~/server/utils/stock-watchlist-queries'
import { stockWatchlistResponseSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const items = await listUserWatchlistItems(user.id)
  return stockWatchlistResponseSchema.parse({ items })
})
