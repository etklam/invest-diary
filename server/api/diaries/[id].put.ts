import type { Diary } from '~/types/diary'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { updateDiaryForUser } from '~/server/utils/diary-write'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event): Promise<Diary> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const diaryId = parsePositiveBigIntParam(event, 'id')
  const body = await readBody(event)

  try {
    const reviewOwnedFields = [
      'reviewStatus',
      'reviewedAt',
      'reviewOutcome',
      'reviewSummary',
      'reviewLearning',
      'reviewAdjustment',
    ]
    const invalidField = reviewOwnedFields.find(field => body && Object.hasOwn(body, field))
    if (invalidField) {
      throw Errors.validationError([{
        field: invalidField,
        message: 'Structured review fields must be updated through the review endpoint',
      }])
    }

    const diary = await updateDiaryForUser({
      userId,
      diaryId,
      body,
    })

    log.info('Diary updated', { diaryId: String(diary.id), userId })
    return serialize(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
