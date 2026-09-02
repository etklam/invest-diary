import { logger } from '~/lib/logger'
import { getUtcDayRange } from '~/lib/dates/normalize'
import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import { diaryListParamsSchema, type DiaryListResponse } from '~/lib/contracts/diary'
import { mapDiaryListResponse } from '~/server/utils/diary-response'
import {
  listDiariesForUser,
  type DiaryListFilters,
} from '~/server/utils/diary-read'

export default defineEventHandler(async (event): Promise<DiaryListResponse> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)

    const query = diaryListParamsSchema.parse(getQuery(event))
    const dateFrom = query.dateFrom ? getUtcDayRange(query.dateFrom).startOfDayUtc : undefined
    const dateTo = query.dateTo ? getUtcDayRange(query.dateTo).endOfDayUtc : undefined

    const filters: DiaryListFilters = {
      page: query.page,
      limit: query.limit,
      search: query.search,
      sortBy: query.sortBy,
      reviewStatus: query.reviewStatus,
      dateFrom,
      dateTo,
    }

    const { items, total } = await listDiariesForUser(userId, filters)

    return mapDiaryListResponse(items, query.page, query.limit, total)
  } catch (error: unknown) {
    handleApiError(error, log)
  }
})
