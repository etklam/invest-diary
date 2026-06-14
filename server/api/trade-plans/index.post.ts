import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { tradePlanInputSchema } from '~/server/utils/trade-plan-schemas'
import { assertDiaryBelongsToUser, tradePlanInclude } from '~/server/utils/trade-plan-queries'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const input = tradePlanInputSchema.parse(await readBody(event))

    await assertDiaryBelongsToUser(input.diaryId, userId)

    const tradePlan = await prisma.tradePlan.create({
      data: {
        userId,
        diaryId: input.diaryId ?? null,
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
        status: input.status,
      },
      include: tradePlanInclude,
    })

    log.info('Trade plan created', { tradePlanId: String(tradePlan.id), userId: user.id })
    return serialize(tradePlan)
  } catch (error) {
    handleApiError(error, log)
  }
})
