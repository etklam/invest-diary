import prisma from '~/lib/prisma'
import { getUtcDayRange } from '~/lib/diary-date'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { attachDiaryTags } from '~/server/utils/diary-response'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const query = getQuery(event)
  const dateStr = query.date as string

  if (!dateStr) {
    throw Errors.validationError([{ field: 'date', message: 'Date is required' }]).toH3Error()
  }

  try {
    // Normalize date search to UTC day range for timezone-stable matching
    const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(dateStr)

    // Find diary within the date range for this user
    const diary = await prisma.diary.findFirst({
      where: {
        userId: user.id,
        date: {
          gte: startOfDayUtc,
          lte: endOfDayUtc,
        },
      },
      include: {
        transactions: true,
        alerts: true,
      },
    })

    log.debug('Loaded diary by date', {
      userId: user.id,
      date: dateStr,
      found: Boolean(diary),
    })

    return diary ? attachDiaryTags(diary) : null
  } catch (error) {
    handleApiError(error, log)
  }
})
