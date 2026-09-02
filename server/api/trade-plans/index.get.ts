import type { Prisma } from '@prisma/client'
import type { TradePlanStatus as PrismaTradePlanStatus } from '@prisma/client'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { sanitizeTradePlanDiary, tradePlanInclude } from '~/server/utils/trade-plan-queries'
import { tradePlanListParamsSchema, toTradePlanListResponse } from '~/lib/contracts/trade-plan'

type TradePlanListRow = Prisma.TradePlanGetPayload<{ include: typeof tradePlanInclude }>

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const query = tradePlanListParamsSchema.parse(getQuery(event))

    const where: Prisma.TradePlanWhereInput = {
      userId,
      ...(query.status ? { status: query.status.toUpperCase() as PrismaTradePlanStatus } : {}),
      ...(query.symbol ? { symbol: { contains: query.symbol } } : {}),
    }

    const orderBy = query.sortBy === 'createdAt-desc'
      ? [{ createdAt: 'desc' as const }, { id: 'desc' as const }]
      : query.sortBy === 'symbol-asc'
        ? [{ symbol: 'asc' as const }, { id: 'asc' as const }]
        : [{ updatedAt: 'desc' as const }, { id: 'desc' as const }]
    const [rows, total] = await Promise.all([
      prisma.tradePlan.findMany({
        where,
        include: tradePlanInclude,
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
      }),
      prisma.tradePlan.count({ where }),
    ]) as [TradePlanListRow[], number]

    return toTradePlanListResponse(
      rows.map(row => sanitizeTradePlanDiary(row, userId)),
      { page: query.page, limit: query.limit, total },
    )
  } catch (error) {
    handleApiError(error, log)
  }
})
