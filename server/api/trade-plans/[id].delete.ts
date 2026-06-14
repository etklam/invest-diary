import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { findTradePlanForUser } from '~/server/utils/trade-plan-queries'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const tradePlanId = parsePositiveBigIntParam(event, 'id')

    await findTradePlanForUser(tradePlanId, userId)
    await prisma.tradePlan.delete({ where: { id: tradePlanId } })

    log.info('Trade plan deleted', { tradePlanId: String(tradePlanId), userId: user.id })
    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
