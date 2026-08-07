import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { getUtcDayRange, isValidYyyyMmDd } from '~/lib/dates/normalize'
import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import { serialize } from '~/server/utils/serialize'
import {
  listDiariesForUser,
  type DiaryListFilters,
} from '~/server/utils/diary-read'

// ponytail: query parsing stays in the handler — listDiariesForUser takes a
// already-shaped filters object so it stays a pure query function.
const MAX_LIMIT = 100
const DEFAULT_LIMIT = 20

function parseDiaryFilterDate(value: unknown, field: 'dateFrom' | 'dateTo'): Date | undefined {
  if (value === undefined || value === null || value === '') return undefined
  if (typeof value !== 'string' || !isValidYyyyMmDd(value)) {
    throw Errors.validationError([{ field, message: 'Date must be a valid YYYY-MM-DD calendar date' }])
  }

  const range = getUtcDayRange(value)
  return field === 'dateFrom' ? range.startOfDayUtc : range.endOfDayUtc
}

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)

    const query = getQuery(event)

    // Pagination
    const rawPage = Number(query.page)
    const rawLimit = Number(query.limit)
    const page = Number.isFinite(rawPage) && rawPage >= 1 ? Math.floor(rawPage) : 1
    const limit = Number.isFinite(rawLimit) && rawLimit >= 1 && rawLimit <= MAX_LIMIT
      ? Math.floor(rawLimit)
      : DEFAULT_LIMIT

    // Days (positive int)
    const rawDays = Number(query.days)
    const days = Number.isFinite(rawDays) && rawDays >= 1 ? Math.floor(rawDays) : undefined

    // Search (trimmed, capped at 500)
    let search: string | undefined
    if (query.search !== undefined && query.search !== null) {
      const trimmed = String(query.search).trim()
      if (trimmed) search = trimmed.slice(0, 500)
    }

    // Sort + reviewStatus — pass through; listDiariesForUser whitelists sort
    const sortBy = typeof query.sortBy === 'string' && query.sortBy ? query.sortBy : undefined
    const reviewStatus = typeof query.reviewStatus === 'string' ? query.reviewStatus : undefined

    // Date range (strict YYYY-MM-DD → UTC day boundaries)
    const dateFrom = parseDiaryFilterDate(query.dateFrom, 'dateFrom')
    const dateTo = parseDiaryFilterDate(query.dateTo, 'dateTo')
    if (typeof query.dateFrom === 'string' && typeof query.dateTo === 'string'
      && query.dateFrom > query.dateTo) {
      throw Errors.validationError([{ field: 'dateTo', message: 'dateTo must be on or after dateFrom' }])
    }

    const filters: DiaryListFilters = {
      page,
      limit,
      days,
      search,
      sortBy,
      reviewStatus,
      dateFrom,
      dateTo,
    }

    const { items, total } = await listDiariesForUser(userId, filters)

    return serialize({
      data: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    handleApiError(error, log)
  }
})
