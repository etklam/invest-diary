import { defineEventHandler } from 'h3'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { deleteDiaryForUser } from '~/server/utils/diary-write'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    const id = parsePositiveBigIntParam(event, 'id')

    await deleteDiaryForUser(id, user.id)

    log.info('Diary deleted', { diaryId: String(id), userId: String(user.id) })
    return { success: true }
  } catch (error) {
    handleApiError(error, log)
  }
})
