import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { findDiaryReviewForUser } from '~/server/utils/diary-review'
import { handleApiError } from '~/server/utils/error-handler'
import { mapDiaryReviewResponse } from '~/server/utils/diary-response'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const diaryId = parsePositiveBigIntParam(event, 'id')

  try {
    return mapDiaryReviewResponse(await findDiaryReviewForUser(diaryId, BigInt(user.id)))
  } catch (error) {
    handleApiError(error, log)
  }
})
