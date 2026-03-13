/**
 * Admin: Get all ETFs
 */

import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  requireUser(event)
  await adminMiddleware(event)

  const etfs = await prisma.etf.findMany({
    include: {
      _count: {
        select: {
          prices: true,
          alerts: true,
          watchlists: true,
        },
      },
    },
    orderBy: {
      symbol: 'asc',
    },
  })

  return etfs.map((etf: any) => ({
    id: etf.id.toString(),
    symbol: etf.symbol,
    name: etf.name,
    priceCount: etf._count.prices,
    alertCount: etf._count.alerts,
    watchlistCount: etf._count.watchlists,
    createdAt: etf.createdAt,
    updatedAt: etf.updatedAt,
  }))
})
