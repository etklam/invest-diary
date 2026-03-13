import prisma from '../../../lib/prisma'
import { logger } from '~/lib/logger'
import { Errors, AppError } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw Errors.validationError([{ field: 'id', message: 'ID is required' }]).toH3Error()
  }

  try {
    // First verify ownership
    const diary = await prisma.diary.findFirst({
      where: {
        id: BigInt(id),
      }
    })

    if (!diary) {
      throw Errors.diaryNotFound(id)
    }

    if (diary.userId?.toString() !== userId.toString()) {
      throw Errors.diaryAccessDenied()
    }

    await prisma.diary.delete({
      where: {
        id: BigInt(id),
      },
    })

    log.info('Diary deleted', { diaryId: id, userId })
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
