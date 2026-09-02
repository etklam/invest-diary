import { updateDiaryRequestSchema, type DiaryResponse } from '~/lib/contracts/diary'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { updateDiaryForUser } from '~/server/utils/diary-write'
import { handleApiError } from '~/server/utils/error-handler'
import { mapDiaryResponse } from '~/server/utils/diary-response'

export default defineEventHandler(async (event): Promise<DiaryResponse> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const diaryId = parsePositiveBigIntParam(event, 'id')
  try {
    const body = updateDiaryRequestSchema.parse(await readBody(event))

    const diary = await updateDiaryForUser({
      userId,
      diaryId,
      body,
    })

    log.info('Diary updated', { diaryId: String(diary.id), userId })
    return mapDiaryResponse(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
