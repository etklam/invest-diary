/**
 * Get user's ETF watchlist
 */

import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { listUserEtfWatchlist } from '~/server/utils/etf-watchlist-queries'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const watchlist = await listUserEtfWatchlist(user.id)

  return serialize(watchlist.map((item: any) => ({
    id: item.id,
    symbol: item.etf.symbol,
    name: item.etf.name,
    sortOrder: item.sortOrder,
    latestPrice: item.etf.prices[0]?.close
      ? Number(item.etf.prices[0].close)
      : null,
    latestDate: item.etf.prices[0]?.date ?? null,
  })))
})
