/**
 * Remove ETF from user's watchlist
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const watchlistId = parsePositiveBigIntParam(event, 'id')

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
