/**
 * Add ETF to user's watchlist
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const body = await readBody(event)
  const { symbol } = body

  if (!symbol || typeof symbol !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid symbol',
    })
  }

  const normalizedSymbol = symbol.toUpperCase().trim()

  // Find ETF
  const etf = await prisma.etf.findUnique({
    where: { symbol: normalizedSymbol },
  })

  if (!etf) {
    throw createError({
      statusCode: 404,
      statusMessage: 'ETF not found',
    })
  }

  // Check if already in watchlist
  const existing = await prisma.etfWatchlist.findUnique({
    where: {
      userId_etfId: {
        userId: user.id,
        etfId: etf.id,
      },
    },
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'ETF already in watchlist',
    })
  }

  // Get max sort order
  const maxSort = await prisma.etfWatchlist.findFirst({
    where: { userId: user.id },
    orderBy: { sortOrder: 'desc' },
  })

  const nextSort = (maxSort?.sortOrder ?? -1) + 1

  // Add to watchlist
  const watchlistItem = await prisma.etfWatchlist.create({
    data: {
      userId: user.id,
      etfId: etf.id,
      sortOrder: nextSort,
    },
  })

  return {
    id: watchlistItem.id.toString(),
    symbol: etf.symbol,
    name: etf.name,
    sortOrder: watchlistItem.sortOrder,
  }
})
