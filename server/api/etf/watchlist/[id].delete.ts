/**
 * Remove ETF from user's watchlist
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const id = getRouterParam(event, 'id')
  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing watchlist item ID',
    })
  }
  if (!/^\d+$/.test(id)) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid watchlist item ID',
    })
  }
  const watchlistId = BigInt(id)

  // Check if item exists and belongs to user
  const item = await prisma.etfWatchlist.findUnique({
    where: { id: watchlistId },
  })

  if (!item) {
    throw createError({
      statusCode: 404,
      statusMessage: 'Watchlist item not found',
    })
  }

  if (String(item.userId) !== String(user.id)) {
    throw createError({
      statusCode: 403,
      statusMessage: 'Forbidden',
    })
  }

  // Delete item
  await prisma.etfWatchlist.delete({
    where: { id: watchlistId },
  })

  return { success: true }
})
