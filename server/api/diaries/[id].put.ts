import type { Diary } from '~/types/diary'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { updateDiaryForUser } from '~/server/utils/diary-write'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event): Promise<Diary> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const diaryId = parsePositiveBigIntParam(event, 'id')
  const body = await readBody(event)

  try {
    const diary = await updateDiaryForUser({
      userId,
      diaryId,
      body,
    })

    log.info('Diary updated', { diaryId: diary.id.toString(), userId })
    return diary
  } catch (error) {
    handleApiError(error, log)
  }
})
