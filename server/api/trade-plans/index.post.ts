import prisma from '~/lib/prisma'
import type { TradePlanStatus as PrismaTradePlanStatus } from '@prisma/client'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { tradePlanInputSchema, toTradePlanResponse } from '~/lib/contracts/trade-plan'
import { assertDiaryBelongsToUser, sanitizeTradePlanDiary, tradePlanInclude } from '~/server/utils/trade-plan-queries'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const input = tradePlanInputSchema.parse(await readBody(event))
    const diaryId = input.diaryId ? BigInt(input.diaryId) : null

    await assertDiaryBelongsToUser(diaryId, userId)

    const tradePlan = await prisma.tradePlan.create({
      data: {
        userId,
        diaryId,
        symbol: input.symbol,
        setupType: input.setupType,
        entryPrice: input.entryPrice,
        entryZoneLow: input.entryZoneLow,
        entryZoneHigh: input.entryZoneHigh,
        stopLoss: input.stopLoss,
        targetPrice: input.targetPrice,
        maxPositionSize: input.maxPositionSize,
        invalidationCondition: input.invalidationCondition,
        notes: input.notes,
        status: input.status.toUpperCase() as PrismaTradePlanStatus,
      },
      include: tradePlanInclude,
    })

    log.info('Trade plan created', { tradePlanId: String(tradePlan.id), userId: user.id })
    return toTradePlanResponse(sanitizeTradePlanDiary(tradePlan, userId))
  } catch (error) {
    handleApiError(error, log)
  }
})
