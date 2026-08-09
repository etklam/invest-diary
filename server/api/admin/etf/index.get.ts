/**
 * Admin: Get all ETFs
 */

import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'
import { serialize } from '~/server/utils/serialize'

type AdminEtfListItem = Awaited<ReturnType<typeof prisma.etf.findMany>>[number]

export default defineEventHandler(async (event) => {
  requireUser(event)
  await adminMiddleware(event)

  const etfs = await prisma.etf.findMany({
    include: {
      _count: {
        select: {
          prices: true,
          watchlists: true,
        },
      },
    },
    orderBy: {
      symbol: 'asc',
    },
  })

  return serialize(etfs.map((etf: AdminEtfListItem) => ({
    id: etf.id,
    symbol: etf.symbol,
    name: etf.name,
    priceCount: etf._count.prices,
    watchlistCount: etf._count.watchlists,
    createdAt: etf.createdAt,
    updatedAt: etf.updatedAt,
  })))
})
