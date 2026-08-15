import type { Diary } from '~/types/diary'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { createDiaryForUser } from '~/server/utils/diary-write'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize, type Serialized } from '~/server/utils/serialize'

export default defineEventHandler(async (event): Promise<Serialized<Diary>> => {
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
      log.info('Diary appended', { diaryId: String(diary.id), userId })
    } else {
      log.info('Diary created', { diaryId: String(diary.id), userId })
    }
    return serialize(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
