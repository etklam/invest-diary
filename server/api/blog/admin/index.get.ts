import prisma from '~/lib/prisma'
import adminMiddleware from '~/server/middleware/admin'
import { serializeBlogPosts } from '~/server/utils/blog-response'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

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
    throw Errors.validationError([{ field: label, message: `Invalid ${label}` }]).toH3Error()
  }
  return parsed
}

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  // Check admin permission
  await adminMiddleware(event)

  try {
    const query = getQuery(event)
    const page = parsePage(query.page, 1)
    const limit = parseLimit(query.limit, 20, 50)
    const skip = (page - 1) * limit
    const status = normalizeQueryValue(query.status) || undefined
    const category = normalizeQueryValue(query.category) || undefined
    const search = normalizeQueryValue(query.search) || undefined
    const author = normalizeQueryValue(query.author) || undefined
    const dateFrom = parseDateParam(query.dateFrom, 'dateFrom')
    const dateTo = parseDateParam(query.dateTo, 'dateTo')
    const sortBy = normalizeQueryValue(query.sortBy) || 'createdAt_desc'

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

    // Filter by author (name or email)
    if (author) {
      where.author = {
        OR: [
          { name: { contains: author } },
          { email: { contains: author } }
        ]
      }
    }

    // Filter by date range (createdAt)
    if (dateFrom || dateTo) {
      where.createdAt = {}
      if (dateFrom) {
        where.createdAt.gte = dateFrom
      }
      if (dateTo) {
        const endDate = new Date(dateTo)
        endDate.setHours(23, 59, 59, 999)
        where.createdAt.lte = endDate
      }
    }

    const sortOptions: Record<string, any> = {
      createdAt_desc: { createdAt: 'desc' },
      createdAt_asc: { createdAt: 'asc' },
      updatedAt_desc: { updatedAt: 'desc' },
      publishedAt_desc: { publishedAt: 'desc' },
      publishedAt_asc: { publishedAt: 'asc' },
      title_asc: { title: 'asc' },
      title_desc: { title: 'desc' }
    }
    const orderBy = sortOptions[sortBy] || sortOptions.createdAt_desc

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
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
      data: serializeBlogPosts(posts),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
