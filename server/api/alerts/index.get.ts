import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { listActiveAlerts } from '~/server/utils/alert-queries'
import type { AlertApiResponse } from '~/types/alert'

export default defineEventHandler(async (event): Promise<AlertApiResponse[]> => {
  const log = logger.alert.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const alerts = await listActiveAlerts(BigInt(user.id))
    return serialize(alerts)
  } catch (error) {
    handleApiError(error, log)
  }
})
