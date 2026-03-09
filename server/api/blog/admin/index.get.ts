import prisma from '~/lib/prisma'
import adminMiddleware from '~/server/middleware/admin'

export default defineEventHandler(async (event) => {
  // Check admin permission
  await adminMiddleware(event)

  console.log('[Blog] Admin: Fetching all posts...')
  try {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const skip = (page - 1) * limit
    const status = query.status as string | undefined
    const category = query.category as string | undefined
    const search = query.search as string | undefined

    // Build where clause (no status filter by default - show all)
    const where: any = {}

    // Filter by status if specified
    if (status) {
      where.status = status
    }

    // Filter by category
    if (category) {
      where.category = category
    }

    // Search in title
    if (search) {
      where.title = {
        contains: search
      }
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          category: true,
          tags: true,
          status: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          author: {
            select: {
              id: true,
              name: true,
              email: true
            }
          }
        },
        skip,
        take: limit,
      }),
      prisma.post.count({ where })
    ])

    return {
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    console.error('[Blog] Admin: Error fetching posts:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch posts'
    })
  }
})
