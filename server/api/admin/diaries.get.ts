import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
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

    console.log('[ADMIN] List all diaries', {
      userId: event.context.user?.id,
      count: diaries.length
    })

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
    console.error('[ADMIN] List diaries error:', error)
    throw error
  }
})
