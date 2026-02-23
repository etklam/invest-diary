import prisma from '../../../lib/prisma'
import { logger } from '~/lib/logger'
import { Errors, AppError } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const rawUserId = event.context.user?.id

  if (!rawUserId) {
    throw Errors.unauthorized().toH3Error()
  }

  // Defensive ID resolution (params may be undefined in some dev/PWA cases)
  const rawFromParams = event.context?.params?.id
  const rawFromRouter = getRouterParam(event, 'id')
  const rawFromPath = event.path?.split('/').filter(Boolean).pop()

  const rawId = rawFromParams ?? rawFromRouter ?? rawFromPath

  if (!rawId) {
    throw Errors.validationError([{ field: 'id', message: 'ID is required' }]).toH3Error()
  }

  const id = String(rawId)

  if (!/^[0-9]+$/.test(id)) {
    throw Errors.validationError([{ field: 'id', message: 'Invalid ID format', value: id }]).toH3Error()
  }

  try {
    const diary = await prisma.diary.findFirst({
      where: {
        id: BigInt(id),
        userId: typeof rawUserId === 'string' ? BigInt(rawUserId) : rawUserId
      },
      include: {
        transactions: true,
        alerts: true,
      },
    })

    if (!diary) {
      throw Errors.diaryNotFound(id)
    }

    log.info('Diary fetched', { diaryId: id })
    return diary
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code })
      throw error.toH3Error()
    }
    log.error('Failed to fetch diary', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
