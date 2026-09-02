import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { mapReviewGroupsResponse } from '~/server/utils/diary-response'
import { buildReviewBuckets } from '~/server/utils/diary-read'
import { getUserTimezone } from '~/server/utils/user-queries'
import type { ReviewGroups } from '~/lib/contracts/review'

export default defineEventHandler(async (event): Promise<ReviewGroups> => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)

    const timeZone = await getUserTimezone(userId)

    const buckets = await buildReviewBuckets(userId, timeZone)

    return mapReviewGroupsResponse(buckets)
  } catch (error) {
    handleApiError(error, log)
  }
})
