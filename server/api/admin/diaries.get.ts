import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)
  await adminMiddleware(event)

  try {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const skip = (page - 1) * limit

    // Get total count
    const total = await prisma.diary.count()

    // Get all diaries with user info
    const diaries = await prisma.diary.findMany({
      skip,
      take: limit,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        },
        _count: {
          select: {
            alerts: true,
            transactions: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    log.info('Listed all diaries', { userId: event.context.user?.id, count: diaries.length })

    return {
      success: true,
      data: diaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
