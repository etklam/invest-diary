/**
 * Get user's ETF watchlist
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const watchlist = await prisma.etfWatchlist.findMany({
    where: { userId: user.id },
    include: {
      etf: {
        include: {
          prices: {
            orderBy: { date: 'desc' },
            take: 1,
          },
        },
      },
    },
    orderBy: { sortOrder: 'asc' },
  })

  return watchlist.map(item => ({
    id: item.id.toString(),
    symbol: item.etf.symbol,
    name: item.etf.name,
    sortOrder: item.sortOrder,
    latestPrice: item.etf.prices[0]?.close
      ? Number(item.etf.prices[0].close)
      : null,
    latestDate: item.etf.prices[0]?.date ?? null,
  }))
})
