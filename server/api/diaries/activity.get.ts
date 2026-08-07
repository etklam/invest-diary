import { Errors } from '~/lib/errors/factory'
import { isValidYyyyMmDd } from '~/lib/dates/normalize'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { getDiaryActivityForUser } from '~/server/utils/diary-activity'

const MAX_ACTIVITY_DAYS = 371

function parseDateQuery(value: unknown, field: 'dateFrom' | 'dateTo'): string {
  if (typeof value !== 'string' || !isValidYyyyMmDd(value)) {
    throw Errors.validationError([{ field, message: 'Date must be a valid YYYY-MM-DD calendar date' }])
  }
  return value
}

function civilDateDistanceInclusive(from: string, to: string): number {
  const fromDate = new Date(`${from}T00:00:00Z`)
  const toDate = new Date(`${to}T00:00:00Z`)
  return Math.floor((toDate.getTime() - fromDate.getTime()) / 86_400_000) + 1
}

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const query = getQuery(event)
    const dateFrom = parseDateQuery(query.dateFrom, 'dateFrom')
    const dateTo = parseDateQuery(query.dateTo, 'dateTo')
    const distance = civilDateDistanceInclusive(dateFrom, dateTo)

    if (distance < 1 || distance > MAX_ACTIVITY_DAYS) {
      throw Errors.validationError([{
        field: 'dateTo',
        message: `Activity range must be between 1 and ${MAX_ACTIVITY_DAYS} days`,
      }])
    }

    const data = await getDiaryActivityForUser(
      BigInt(user.id),
      dateFrom,
      dateTo,
    )

    return serialize({ data, dateFrom, dateTo })
  } catch (error) {
    handleApiError(error, log)
  }
})
