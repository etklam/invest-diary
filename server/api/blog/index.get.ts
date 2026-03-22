import type { H3Event } from 'h3'
import prisma from '~/lib/prisma'

const LEGACY_CATEGORY_ALIASES: Record<string, string[]> = {
  fundamental: ['基本面分析', 'Fundamental Analysis'],
  technical: ['技术面分析', '技術面分析', 'Technical Analysis'],
  market: ['市场观察', '市場觀察', 'Market Watch'],
  strategy: ['投资策略', '投資策略', 'Investment Strategy']
}

const normalizeQueryValue = (value: unknown) => {
  if (value === undefined || value === null) return ''
  return String(value).trim()
}

const parsePage = (value: unknown, fallback: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return fallback
  return Math.floor(parsed)
}

const parseLimit = (value: unknown, fallback: number, max: number) => {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > max) return fallback
  return Math.floor(parsed)
}

const parseDateParam = (value: unknown, label: string) => {
  const normalized = normalizeQueryValue(value)
  if (!normalized) return undefined
  const parsed = new Date(normalized)
  if (Number.isNaN(parsed.getTime())) {
    throw createError({
      statusCode: 400,
      statusMessage: `Invalid ${label}`
    })
  }
  return parsed
}

export default defineEventHandler(async (event: H3Event) => {
  console.log('[Blog] Fetching public blog posts...')
  try {
    const query = getQuery(event)
    const page = parsePage(query.page, 1)
    const limit = parseLimit(query.limit, 9, 50)
    const skip = (page - 1) * limit
    const category = normalizeQueryValue(query.category) || undefined
    const tag = normalizeQueryValue(query.tag) || undefined
    const search = normalizeQueryValue(query.search) || undefined
    const dateFrom = parseDateParam(query.dateFrom, 'dateFrom')
    const dateTo = parseDateParam(query.dateTo, 'dateTo')

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
      const categoryAliases = LEGACY_CATEGORY_ALIASES[category] || []
      where.category = { in: [category, ...categoryAliases] }
    }

    // Filter by tag (tags are stored as comma-separated string)
    // 效能備註：使用 contains 進行子字串匹配
    if (tag) {
      where.tags = { contains: tag }
    }

    // Search in title and excerpt (fulltext)
    if (search) {
      where.OR = [
        { title: { search } },
        { excerpt: { search } }
      ]
    }

    if (dateFrom || dateTo) {
      where.publishedAt = {
        ...where.publishedAt,
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo
          ? (() => {
              const endDate = new Date(dateTo)
              endDate.setHours(23, 59, 59, 999)
              return { lte: endDate }
            })()
          : {})
      }
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
  } catch (error: any) {
    console.error('[Blog] Error fetching posts:', error)

    if (error?.statusCode) {
      throw error
    }

    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch posts'
    })
  }
})
