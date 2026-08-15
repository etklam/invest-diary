import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { createAlertForDiary } from '~/server/utils/alert-queries'
import type { AlertApiResponse } from '~/types/alert'

export default defineEventHandler(async (event): Promise<AlertApiResponse | null> => {
  const log = logger.alert.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const body = await readBody(event)

    const alert = await createAlertForDiary(BigInt(user.id), body)

    log.info(body?.recurring_mode ? 'Recurring alerts created' : 'Single alert created', {
      alertId: alert ? String(alert.id) : null,
      userId: String(user.id),
    })
    return serialize(alert)
  } catch (error) {
    handleApiError(error, log)
  }
})
