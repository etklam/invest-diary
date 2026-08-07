import { Errors } from '~/lib/errors/factory'
import { isValidYyyyMmDd } from '~/lib/dates/normalize'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { findDiaryByDate } from '~/server/utils/diary-read'
import { attachDiaryTags } from '~/server/utils/diary-response'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const query = getQuery(event)
  const dateStr = query.date as string

  if (!dateStr) {
    throw Errors.validationError([{ field: 'date', message: 'Date is required' }]).toH3Error()
  }
  if (!isValidYyyyMmDd(dateStr)) {
    throw Errors.validationError([
      { field: 'date', message: 'Date must be a valid YYYY-MM-DD calendar date' },
    ]).toH3Error()
  }

  try {
    const diary = await findDiaryByDate(dateStr, BigInt(user.id))

    log.debug('Loaded diary by date', {
      userId: user.id,
      date: dateStr,
      found: Boolean(diary),
    })

    return diary ? serialize(attachDiaryTags(diary)) : null
  } catch (error) {
    handleApiError(error, log)
  }
})
