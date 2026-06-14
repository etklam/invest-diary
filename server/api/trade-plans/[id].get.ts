import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { findTradePlanForUser } from '~/server/utils/trade-plan-queries'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const tradePlanId = parsePositiveBigIntParam(event, 'id')
    const tradePlan = await findTradePlanForUser(tradePlanId, BigInt(user.id))

    return serialize(tradePlan)
  } catch (error) {
    handleApiError(error, log)
  }
})
