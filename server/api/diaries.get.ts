import { logger } from '~/lib/logger'
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

    // Date range (YYYY-MM-DD → UTC day boundaries)
    let dateFrom: Date | undefined
    let dateTo: Date | undefined
    if (typeof query.dateFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.dateFrom)) {
      const [y, m, d] = query.dateFrom.split('-').map(Number)
      dateFrom = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0, 0))
    }
    if (typeof query.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.dateTo)) {
      const [y, m, d] = query.dateTo.split('-').map(Number)
      dateTo = new Date(Date.UTC(y!, m! - 1, d!, 23, 59, 59, 999))
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
