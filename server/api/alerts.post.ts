import type { Prisma } from '@prisma/client'
import prisma from '../../lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { persistAlert } from '~/server/utils/alert-persistence'

export default defineEventHandler(async (event) => {
  const log = logger.alert.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const body = await readBody(event)

  // Support both single and recurring alerts
  if (!body.diary_id || !body.message) {
    throw Errors.validationError([
      { field: 'diary_id', message: 'Required' },
      { field: 'message', message: 'Required' },
    ]).toH3Error()
  }

  try {
    // Verify diary ownership
    const diary = await prisma.diary.findFirst({
      where: {
        id: BigInt(body.diary_id),
        userId: userId
      }
    })

    if (!diary) {
      throw Errors.diaryNotFound(body.diary_id).toH3Error()
    }

    const alert = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      return await persistAlert(tx, BigInt(body.diary_id), {
        message: body.message,
        trigger_at: body.trigger_at,
        recurring_mode: body.recurring_mode,
      })
    })

    log.info(body.recurring_mode ? 'Recurring alerts created' : 'Single alert created', {
      alertId: alert ? String(alert.id) : null,
      userId,
    })
    return serialize(alert)

  } catch (error) {
    handleApiError(error, log)
  }
})
