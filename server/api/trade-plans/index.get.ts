import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { tradePlanInclude } from '~/server/utils/trade-plan-queries'
import { tradePlanStatusQuerySchema } from '~/server/utils/trade-plan-schemas'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const query = getQuery(event)
    const status = tradePlanStatusQuerySchema.parse(typeof query.status === 'string' ? query.status : undefined)
    const symbol = typeof query.symbol === 'string' && query.symbol.trim()
      ? normalizeStockSymbol(query.symbol)
      : undefined

    const where: Prisma.TradePlanWhereInput = {
      userId,
      ...(status ? { status } : {}),
      ...(symbol ? { symbol: { contains: symbol } } : {}),
    }

    const data = await prisma.tradePlan.findMany({
      where,
      include: tradePlanInclude,
      orderBy: { updatedAt: 'desc' },
    })

    return serialize({ data })
  } catch (error) {
    handleApiError(error, log)
  }
})
