import { createDiaryRequestSchema, type DiaryResponse } from '~/lib/contracts/diary'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { createDiaryForUser } from '~/server/utils/diary-write'
import { mapDiaryResponse } from '~/server/utils/diary-response'

export default defineEventHandler(async (event): Promise<DiaryResponse> => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, ['DIARY_CREATE', 'AGENT_WRITE'])
    const body = createDiaryRequestSchema.parse(await readBody(event))

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
    setResponseStatus(event, 201)

    log.info('Diary created via API key', {
      diaryId: String(diary.id),
      userId: auth.user.id,
      apiKeyId: auth.apiKeyId,
    })

    return mapDiaryResponse(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
