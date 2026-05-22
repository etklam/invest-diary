import prisma from '../../../lib/prisma'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { attachDiaryTags } from '~/server/utils/diary-response'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const rawUserId = event.context.user?.id

  if (!rawUserId) {
    throw Errors.unauthorized().toH3Error()
  }

  const diaryId = parsePositiveBigIntParam(event, 'id')
  const diaryIdString = diaryId.toString()

  try {
    const diary = await prisma.diary.findFirst({
      where: {
        id: diaryId,
      },
      include: {
        transactions: true,
        alerts: true,
      },
    })

    if (!diary) {
      throw Errors.diaryNotFound(diaryIdString)
    }

    if (diary.userId?.toString() !== rawUserId.toString()) {
      throw Errors.diaryAccessDenied()
    }

    log.info('Diary fetched', { diaryId: diaryIdString })
    return serialize(attachDiaryTags(diary))
  } catch (error) {
    handleApiError(error, log)
  }
})
