import prisma from '../../../lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const latestDiary = await prisma.diary.findFirst({
      where: {
        userId: user.id
      },
      orderBy: {
        createdAt: 'desc',
      },
      include: {
        transactions: true,
      },
    })

    if (!latestDiary) {
      return null
    }

    return {
      diary_id: latestDiary.id,
      diary_date: latestDiary.createdAt,
      transactions: latestDiary.transactions,
    }
  } catch (error) {
    log.error('Failed to fetch latest transactions', {
      userId: user.id,
      error,
    })
    throw Errors.internalError(error).toH3Error()
  }
})
