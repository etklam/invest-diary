/**
 * Remove ETF from user's watchlist
 */

import { requireUser } from '~/server/utils/auth'
import prisma from '~/lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const watchlistId = parsePositiveBigIntParam(event, 'id')

  // Check if item exists and belongs to user
  const item = await prisma.etfWatchlist.findUnique({
    where: { id: watchlistId },
  })

  if (!item) {
    throw Errors.notFound().toH3Error()
  }

  if (String(item.userId) !== String(user.id)) {
    throw Errors.forbidden().toH3Error()
  }

  // Delete item
  await prisma.etfWatchlist.delete({
    where: { id: watchlistId },
  })

  return { success: true }
})
