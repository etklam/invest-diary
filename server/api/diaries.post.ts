import type { Diary } from '~/types/diary'
import { Errors, AppError } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { createDiaryForUser } from '~/server/utils/diary-write'

export default defineEventHandler(async (event): Promise<Diary> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const body = await readBody(event)

  try {
    const diary = await createDiaryForUser({
      userId,
      body,
      createdVia: 'WEB',
    })

    if (body?.appendToToday) {
      log.info('Diary appended', { diaryId: diary.id.toString(), userId })
    } else {
      log.info('Diary created', { diaryId: diary.id.toString(), userId })
    }
    return diary
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code, userId })
      throw error.toH3Error()
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    log.error('Error creating diary', { userId, error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
