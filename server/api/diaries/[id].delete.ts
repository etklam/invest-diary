import prisma from '../../../lib/prisma'
import { logger } from '~/lib/logger'
import { Errors, AppError } from '~/lib/errors/factory'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const diaryId = parsePositiveBigIntParam(event, 'id')
  const diaryIdString = diaryId.toString()

  try {
    // First verify ownership
    const diary = await prisma.diary.findFirst({
      where: {
        id: diaryId,
      }
    })

    if (!diary) {
      throw Errors.diaryNotFound(diaryIdString)
    }

    if (diary.userId?.toString() !== userId.toString()) {
      throw Errors.diaryAccessDenied()
    }

    await prisma.diary.delete({
      where: {
        id: diaryId,
      },
    })

    log.info('Diary deleted', { diaryId: diaryIdString, userId })
    return { success: true }
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code })
      throw error.toH3Error()
    }
    log.error('Failed to delete diary', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
