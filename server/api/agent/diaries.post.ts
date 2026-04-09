import type { Diary } from '~/types/diary'
import { AppError, Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { createDiaryForUser } from '~/server/utils/diary-write'

export default defineEventHandler(async (event): Promise<Diary> => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, 'DIARY_CREATE')
    const body = await readBody(event)

    if (body?.appendToToday) {
      throw Errors.validationError([
        { field: 'appendToToday', message: 'appendToToday is not available for API key diary creation' },
      ])
    }

    const diary = await createDiaryForUser({
      userId: auth.user.id,
      body,
      createdVia: 'API_KEY',
      createdByLabel: auth.label,
    })

    log.info('Diary created via API key', {
      diaryId: diary.id.toString(),
      userId: auth.user.id,
      apiKeyId: auth.apiKeyId,
    })

    return diary
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code })
      throw error.toH3Error()
    }
    log.error('Failed to create diary via API key', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
