/**
 * Get user's ETF watchlist
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
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

  return watchlist.map((item: any) => ({
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
