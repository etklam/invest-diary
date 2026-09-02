import { createDiaryRequestSchema, type DiaryResponse } from '~/lib/contracts/diary'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { createDiaryForUser } from '~/server/utils/diary-write'
import { handleApiError } from '~/server/utils/error-handler'
import { mapDiaryResponse } from '~/server/utils/diary-response'

export default defineEventHandler(async (event): Promise<DiaryResponse> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  try {
    const body = createDiaryRequestSchema.parse(await readBody(event))
    const diary = await createDiaryForUser({
      userId,
      body,
      createdVia: 'WEB',
    })
    setResponseStatus(event, 201)

    if (body?.appendToToday) {
      log.info('Diary appended', { diaryId: String(diary.id), userId })
    } else {
      log.info('Diary created', { diaryId: String(diary.id), userId })
    }
    return mapDiaryResponse(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
