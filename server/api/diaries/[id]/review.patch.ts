import { logger } from '~/lib/logger'
import { structuredReviewInputSchema } from '~/lib/contracts/review'
import { requireUser } from '~/server/utils/auth'
import {
  saveStructuredReviewForUser,
} from '~/server/utils/diary-review'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const diaryId = parsePositiveBigIntParam(event, 'id')

  try {
    const input = structuredReviewInputSchema.parse(await readBody(event))
    const diary = await saveStructuredReviewForUser(diaryId, BigInt(user.id), input)

    log.info('Structured diary review saved', {
      diaryId: String(diaryId),
      reviewOutcome: input.reviewOutcome,
      userId: user.id,
    })

    return serialize(diary)
  } catch (error) {
    handleApiError(error, log)
  }
})
