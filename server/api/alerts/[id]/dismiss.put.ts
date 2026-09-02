import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { dismissAlert } from '~/server/utils/alert-queries'
import { toAlertResponse } from '~/lib/contracts/alerts'

export default defineEventHandler(async (event) => {
  const log = logger.alert.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const id = parsePositiveBigIntParam(event, 'id')

    const updated = await dismissAlert(id, BigInt(user.id))

    log.info('Dismissed alert', { userId: String(user.id), alertId: String(id) })
    return toAlertResponse(updated)
  } catch (error) {
    handleApiError(error, log)
  }
})
