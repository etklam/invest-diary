import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { findDiaryDetailForUser } from '~/server/utils/diary-read'
import { attachDiaryMetadata } from '~/server/utils/diary-response'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const rawUserId = event.context.user?.id

  if (!rawUserId) {
    throw Errors.unauthorized().toH3Error()
  }

  const diaryId = parsePositiveBigIntParam(event, 'id')

  try {
    const diary = await findDiaryDetailForUser(diaryId, rawUserId)

    log.info('Diary fetched', { diaryId: String(diaryId) })
    return serialize(attachDiaryMetadata(diary))
  } catch (error) {
    handleApiError(error, log)
  }
})
