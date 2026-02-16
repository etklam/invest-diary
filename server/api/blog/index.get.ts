import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  console.log('[Blog] Fetching public blog posts...')
  try {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 9
    const skip = (page - 1) * limit
    const category = query.category as string | undefined
    const tag = query.tag as string | undefined
    const search = query.search as string | undefined

    // Build where clause for published posts only
    const where: any = {
      status: 'PUBLISHED',
      publishedAt: {
        not: null
      }
    }

    // Filter by category
    if (category) {
      where.category = category
    }

    // Filter by tag (tags are stored as comma-separated string)
    if (tag) {
      where.tags = {
        contains: tag
      }
    }

    // Search in title and excerpt
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } }
      ]
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        include: {
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
    console.error('[Blog] Error fetching posts:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch posts'
    })
  }
})
