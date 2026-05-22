import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'

/**
 * List all ETF watchlist items for a user, including ETF details with latest price.
 */
export async function listUserEtfWatchlist(userIdInput: string | bigint) {
  const userId = BigInt(userIdInput)

  return prisma.etfWatchlist.findMany({
    where: { userId },
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
}

/**
 * Add an ETF to a user's watchlist.
 * Validates: ETF exists, not already in watchlist.
 * Calculates next sort order automatically.
 */
export async function addEtfToWatchlist(userIdInput: string | bigint, symbolRaw: string) {
  const userId = BigInt(userIdInput)
  const symbol = symbolRaw.toUpperCase().trim()

  // Find ETF
  const etf = await prisma.etf.findUnique({
    where: { symbol },
  })

  if (!etf) {
    throw Errors.etfNotFound(symbol)
  }

  // Check if already in watchlist
  const existing = await prisma.etfWatchlist.findUnique({
    where: {
      userId_etfId: {
        userId,
        etfId: etf.id,
      },
    },
  })

  if (existing) {
    throw Errors.etfAlreadyInWatchlist(symbol)
  }

  // Get max sort order
  const maxSort = await prisma.etfWatchlist.findFirst({
    where: { userId },
    orderBy: { sortOrder: 'desc' },
  })

  const nextSort = (maxSort?.sortOrder ?? -1) + 1

  // Add to watchlist
  return prisma.etfWatchlist.create({
    data: {
      userId,
      etfId: etf.id,
      sortOrder: nextSort,
    },
    include: { etf: true },
  })
}

/**
 * Remove an ETF from a user's watchlist.
 * Validates: item exists, ownership matches.
 */
export async function removeEtfFromWatchlist(watchlistId: bigint, userIdInput: string | bigint) {
  const userId = BigInt(userIdInput)

  const item = await prisma.etfWatchlist.findUnique({
    where: { id: watchlistId },
  })

  if (!item) {
    throw Errors.notFound()
  }

  if (String(item.userId) !== String(userId)) {
    throw Errors.forbidden()
  }

  await prisma.etfWatchlist.delete({
    where: { id: watchlistId },
  })
}
