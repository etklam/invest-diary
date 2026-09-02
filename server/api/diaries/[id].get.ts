import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { findDiaryDetailForUser } from '~/server/utils/diary-read'
import { mapDiaryResponse } from '~/server/utils/diary-response'
import { handleApiError } from '~/server/utils/error-handler'
import type { DiaryResponse } from '~/lib/contracts/diary'

export default defineEventHandler(async (event): Promise<DiaryResponse> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const rawUserId = event.context.user?.id

  if (!rawUserId) {
    throw Errors.unauthorized().toH3Error()
  }

  const diaryId = parsePositiveBigIntParam(event, 'id')

  try {
    const diary = await findDiaryDetailForUser(diaryId, rawUserId)

    log.info('Diary fetched', { diaryId: String(diaryId) })
    return mapDiaryResponse(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
