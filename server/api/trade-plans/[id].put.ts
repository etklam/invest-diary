import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { tradePlanUpdateSchema } from '~/server/utils/trade-plan-schemas'
import { assertDiaryBelongsToUser, findTradePlanForUser, tradePlanInclude } from '~/server/utils/trade-plan-queries'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const tradePlanId = parsePositiveBigIntParam(event, 'id')
    const input = tradePlanUpdateSchema.parse(await readBody(event))

    await findTradePlanForUser(tradePlanId, userId)
    await assertDiaryBelongsToUser(input.diaryId, userId)

    const tradePlan = await prisma.tradePlan.update({
      where: { id: tradePlanId },
      data: {
        ...(input.diaryId !== undefined ? { diaryId: input.diaryId ?? null } : {}),
        ...(input.symbol !== undefined ? { symbol: input.symbol } : {}),
        ...(input.setupType !== undefined ? { setupType: input.setupType } : {}),
        ...(input.entryPrice !== undefined ? { entryPrice: input.entryPrice } : {}),
        ...(input.entryZoneLow !== undefined ? { entryZoneLow: input.entryZoneLow } : {}),
        ...(input.entryZoneHigh !== undefined ? { entryZoneHigh: input.entryZoneHigh } : {}),
        ...(input.stopLoss !== undefined ? { stopLoss: input.stopLoss } : {}),
        ...(input.targetPrice !== undefined ? { targetPrice: input.targetPrice } : {}),
        ...(input.maxPositionSize !== undefined ? { maxPositionSize: input.maxPositionSize } : {}),
        ...(input.invalidationCondition !== undefined ? { invalidationCondition: input.invalidationCondition } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
      },
      include: tradePlanInclude,
    })

    log.info('Trade plan updated', { tradePlanId: String(tradePlan.id), userId: user.id })
    return serialize(tradePlan)
  } catch (error) {
    handleApiError(error, log)
  }
})
