import { requireUser } from '~/server/utils/auth'
import { listUserWatchlistItems } from '~/server/utils/stock-watchlist-queries'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const items = await listUserWatchlistItems(user.id)
  return serialize({ items })
})
