import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const auth = requireUser(event)

  const user = await prisma.user.findUnique({
    where: { id: BigInt(auth.id) },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      expectedMonthlyTrades: true,
      expectedProfit: true,
      expectedAvgHolding: true,
      timezone: true,
      favoriteTagsString: true,
      createdAt: true,
      updatedAt: true
    }
  })

  if (!user) {
    throw Errors.userNotFound().toH3Error()
  }

  return {
    ok: true,
    data: {
      id: user.id.toString(),
      email: user.email,
      name: user.name,
      role: user.role,
      expectedMonthlyTrades: user.expectedMonthlyTrades,
      expectedProfit: user.expectedProfit,
      expectedAvgHolding: user.expectedAvgHolding,
      timezone: user.timezone,
      favoriteTagsString: user.favoriteTagsString,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    }
  }
})
