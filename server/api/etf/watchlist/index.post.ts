/**
 * Add ETF to user's watchlist
 */

import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const body = await readBody(event)
  const { symbol } = body

  if (!symbol || typeof symbol !== 'string') {
    throw Errors.validationError([{ field: 'symbol', message: 'Symbol is required' }]).toH3Error()
  }

  const normalizedSymbol = symbol.toUpperCase().trim()

  try {
    // Find ETF
    const etf = await prisma.etf.findUnique({
      where: { symbol: normalizedSymbol },
    })

    if (!etf) {
      throw Errors.etfNotFound(normalizedSymbol).toH3Error()
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
      throw Errors.etfAlreadyInWatchlist(normalizedSymbol).toH3Error()
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

    log.info('Added ETF to watchlist', {
      userId: user.id,
      symbol: normalizedSymbol,
      watchlistItemId: String(watchlistItem.id),
    })

    return serialize({
      id: watchlistItem.id,
      symbol: etf.symbol,
      name: etf.name,
      sortOrder: watchlistItem.sortOrder,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
