import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { createAlertForDiary } from '~/server/utils/alert-queries'
import { alertCreateRequestSchema, toAlertResponse } from '~/lib/contracts/alerts'

export default defineEventHandler(async (event) => {
  const log = logger.alert.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const body = alertCreateRequestSchema.parse(await readBody(event))

    const alert = await createAlertForDiary(BigInt(user.id), body)

    log.info(body.recurringMode ? 'Recurring alerts created' : 'Single alert created', {
      alertId: alert ? String(alert.id) : null,
      userId: String(user.id),
    })
    return alert ? toAlertResponse(alert) : null
  } catch (error) {
    handleApiError(error, log)
  }
})
