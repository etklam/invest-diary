import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { listActiveAlerts } from '~/server/utils/alert-queries'
import { alertListResponseSchema } from '~/lib/contracts/alerts'

export default defineEventHandler(async (event) => {
  const log = logger.alert.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const alerts = await listActiveAlerts(BigInt(user.id))
    return alertListResponseSchema.parse(alerts)
  } catch (error) {
    handleApiError(error, log)
  }
})
