import prisma from '../../../../lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const log = logger.alert.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const alertId = parsePositiveBigIntParam(event, 'id')

  try {
    // Verify ownership via diary relation
    const alert = await prisma.alert.findFirst({
      where: {
        id: alertId,
        diary: {
          userId: user.id
        }
      }
    })

    if (!alert) {
      throw Errors.alertNotFound(alertId.toString()).toH3Error()
    }

    const updatedAlert = await prisma.alert.update({
      where: {
        id: alertId,
      },
      data: {
        isDismissed: true,
      },
    })

    log.info('Dismissed alert', {
      userId: user.id,
      alertId: alertId.toString(),
    })
    return updatedAlert
  } catch (error) {
    handleApiError(error, log)
  }
})
