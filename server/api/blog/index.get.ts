import prisma from '~/lib/prisma'

const LEGACY_CATEGORY_ALIASES: Record<string, string[]> = {
  fundamental: ['基本面分析', 'Fundamental Analysis'],
  technical: ['技术面分析', '技術面分析', 'Technical Analysis'],
  market: ['市场观察', '市場觀察', 'Market Watch'],
  strategy: ['投资策略', '投資策略', 'Investment Strategy']
}

export default defineEventHandler(async (event) => {
  console.log('[Blog] Fetching public blog posts...')
  try {
    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 9
    const skip = (page - 1) * limit
    const category = query.category as string | undefined
    const tag = query.tag as string | undefined
    const rawSearch = query.search as string | undefined
    const search = rawSearch?.trim()

    // Build where clause for published posts only
    // 效能優化：使用型別安全的 where 條件
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const where: any = {
      status: 'PUBLISHED',
      publishedAt: {
        not: null
      }
    }

    // Filter by category
    if (category) {
      const normalizedCategory = category.trim()
      const categoryAliases = LEGACY_CATEGORY_ALIASES[normalizedCategory] || []
      where.category = { in: [normalizedCategory, ...categoryAliases] }
    }

    // Filter by tag (tags are stored as comma-separated string)
    // 效能備註：使用 contains 進行子字串匹配
    if (tag) {
      where.tags = { contains: tag }
    }

    // Search in title, excerpt and content
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { excerpt: { contains: search } },
        { content: { contains: search } }
      ]
    }

    // 效能優化：使用 select 只選擇列表頁需要的欄位
    // 排除 content 欄位（每篇文章約減少 5-10KB）
    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          coverImage: true,
          category: true,
          tags: true,
          publishedAt: true,
          createdAt: true,
          updatedAt: true,
          // ❌ Excluding 'content' field - not needed for list view
          author: {
            select: {
              id: true,
              name: true,
              // 不需要 email用於列表頁
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
