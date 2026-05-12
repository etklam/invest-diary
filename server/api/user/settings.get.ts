import prisma from '../../../lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
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
    throw Errors.userNotFound().toH3Error()
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
