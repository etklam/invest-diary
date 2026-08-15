import type { Diary } from '~/types/diary'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { createDiaryForUser } from '~/server/utils/diary-write'
import { serialize, type Serialized } from '~/server/utils/serialize'

export default defineEventHandler(async (event): Promise<Serialized<Diary>> => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, ['DIARY_CREATE', 'AGENT_WRITE'])
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
      diaryId: String(diary.id),
      userId: auth.user.id,
      apiKeyId: auth.apiKeyId,
    })

    return serialize(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
