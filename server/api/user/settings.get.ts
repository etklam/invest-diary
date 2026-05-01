import prisma from '../../../lib/prisma'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
    select: {
      id: true,
      email: true,
      name: true,
      expectedMonthlyTrades: true,
      expectedProfit: true,
      expectedAvgHolding: true,
      timezone: true,
      createdAt: true
    }
  })

  if (!user) {
    throw createError({
      statusCode: 404,
      statusMessage: 'User not found'
    })
  }

  return {
    success: true,
    settings: {
      name: user.name,
      expectedMonthlyTrades: user.expectedMonthlyTrades,
      expectedProfit: user.expectedProfit,
      expectedAvgHolding: user.expectedAvgHolding,
      timezone: user.timezone
    }
  }
})
