import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { toTradePlanResponse } from '~/lib/contracts/trade-plan'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { findTradePlanDetailForUser } from '~/server/utils/trade-plan-queries'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const tradePlanId = parsePositiveBigIntParam(event, 'id')
    const tradePlan = await findTradePlanDetailForUser(tradePlanId, BigInt(user.id))

    return toTradePlanResponse(tradePlan)
  } catch (error) {
    handleApiError(error, log)
  }
})
