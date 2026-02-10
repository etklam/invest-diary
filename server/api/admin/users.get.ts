import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  await adminMiddleware(event)

  try {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 10
    const search = query.search as string | undefined

    const skip = (page - 1) * limit

    // Build where clause for search
    const where = search
      ? {
          OR: [
            { email: { contains: search } },
            { name: { contains: search } }
          ]
        }
      : {}

    // Get total count
    const total = await prisma.user.count({ where })

    // Get users with pagination
    const users = await prisma.user.findMany({
      where,
      skip,
      take: limit,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: {
          select: {
            diaries: true,
            alerts: true,
            transactions: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log('[ADMIN] List users', { userId: event.context.user?.id, count: users.length })

    return {
      success: true,
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    }
  } catch (error) {
    console.error('[ADMIN] List users error:', error)
    throw error
  }
})
