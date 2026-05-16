import prisma from '~/lib/prisma'
import { serializeBlogPosts } from '~/server/utils/blog-response'
import { Errors } from '~/lib/errors/factory'

const DEFAULT_PAGE = 1
const DEFAULT_LIMIT = 20
export const PUBLIC_DEFAULT_LIMIT = 9
const MAX_LIMIT = 50

const LEGACY_CATEGORY_ALIASES: Record<string, string[]> = {
  fundamental: ['基本面分析', 'Fundamental Analysis'],
  technical: ['技术面分析', '技術面分析', 'Technical Analysis'],
  market: ['市场观察', '市場觀察', 'Market Watch'],
  strategy: ['投资策略', '投資策略', 'Investment Strategy'],
}

const SORT_OPTIONS: Record<string, Record<string, 'asc' | 'desc'>> = {
  publishedAt_desc: { publishedAt: 'desc' },
  publishedAt_asc: { publishedAt: 'asc' },
  createdAt_desc: { createdAt: 'desc' },
  createdAt_asc: { createdAt: 'asc' },
  updatedAt_desc: { updatedAt: 'desc' },
  updatedAt_asc: { updatedAt: 'asc' },
  title_asc: { title: 'asc' },
  title_desc: { title: 'desc' },
}

export interface PostQueryConfig {
  /** Filter by status. undefined = all statuses. */
  status?: 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
  /** Filter by category. */
  category?: string
  /** Filter by tag substring. */
  tag?: string
  /** Search string. */
  search?: string
  /** Filter by author name or email via contains. */
  author?: string
  /** Date range start (inclusive). */
  dateFrom?: Date
  /** Date range end (inclusive, time set to end-of-day). */
  dateTo?: Date
  /** Which date column to filter on. Default: 'publishedAt'. */
  dateField?: 'publishedAt' | 'createdAt'
  /** Whether invalid dates should throw 400. Default: false. */
  strictDateValidation?: boolean
  /** Sort key. */
  sortBy?: string
  /** Fallback sort when sortBy is not specified. Default: 'publishedAt_desc'. */
  defaultSortBy?: string
  /** Page number (1-based). Default: 1. */
  page?: number
  /** Raw limit from query string. Passed as-is; resolved inside queryPosts. */
  limit?: number
  /** Default page size when no limit param provided. Default: 20. */
  defaultLimit?: number
  /** Include author email in response. Default: false. */
  includeEmail?: boolean
  /** Include post status in response. Default: false. */
  includeStatus?: boolean
  /** Whether to expand category aliases. Default: false. */
  enableCategoryAliases?: boolean
  /** Fields to search in. Default: ['title'] (admin), ['title', 'excerpt'] (public). */
  searchFields?: ('title' | 'excerpt')[]
  /** Search mode: 'contains' = substring match, 'search' = Prisma full-text. Default: 'contains'. */
  searchMode?: 'contains' | 'search'
  /** Enforce publishedAt IS NOT NULL for PUBLISHED status. Default: true (public), false (admin). */
  requirePublishedAt?: boolean
}

export interface PostListResult {
  data: ReturnType<typeof serializeBlogPosts>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
}

function parsePage(value: unknown): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return DEFAULT_PAGE
  return Math.floor(parsed)
}

function resolveLimit(value: unknown, defaultLimit: number): number {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > MAX_LIMIT) return defaultLimit
  return Math.floor(parsed)
}

function normalizeString(value: unknown): string | undefined {
  if (value === undefined || value === null) return undefined
  const str = String(value).trim()
  return str || undefined
}

function parseDateParam(value: unknown, strict: boolean): Date | undefined {
  const str = normalizeString(value)
  if (!str) return undefined
  const parsed = new Date(str)
  if (Number.isNaN(parsed.getTime())) {
    if (strict) {
      throw Errors.validationError([{ field: 'date', message: 'Invalid date format' }]).toH3Error()
    }
    return undefined
  }
  return parsed
}

function endOfDay(date: Date): Date {
  const d = new Date(date)
  d.setHours(23, 59, 59, 999)
  return d
}

/**
 * Query blog posts with filtering, sorting, and pagination.
 *
 * The only function callers need to list posts — hides Prisma query
 * construction, serialization, and pagination math behind a single call.
 */
export async function queryPosts(config: PostQueryConfig = {}): Promise<PostListResult> {
  const effectiveDefaultLimit = config.defaultLimit ?? DEFAULT_LIMIT
  const page = config.page ?? DEFAULT_PAGE
  const limit = resolveLimit(config.limit, effectiveDefaultLimit)
  const skip = (page - 1) * limit
  const effectiveDefaultSort = config.defaultSortBy || 'publishedAt_desc'
  const sortBy = config.sortBy || effectiveDefaultSort
  const orderBy = SORT_OPTIONS[sortBy] || SORT_OPTIONS[effectiveDefaultSort]
  const dateField = config.dateField || 'publishedAt'

  // Build where clause
  const where: any = {}

  if (config.status) {
    where.status = config.status
  }

  if (config.category) {
    if (config.enableCategoryAliases) {
      const aliases = LEGACY_CATEGORY_ALIASES[config.category]
      if (aliases && aliases.length > 0) {
        where.category = { in: [config.category, ...aliases] }
      } else {
        where.category = config.category
      }
    } else {
      where.category = config.category
    }
  }

  if (config.tag) {
    where.tags = { contains: config.tag }
  }

  if (config.search) {
    const fields = config.searchFields || ['title']
    const mode = config.searchMode || 'contains'
    if (fields.length === 1) {
      const field = fields[0]!
      where[field] = mode === 'search' ? { search: config.search } : { contains: config.search }
    } else {
      where.OR = fields.map(field => ({
        [field]: mode === 'search' ? { search: config.search } : { contains: config.search },
      }))
    }
  }

  if (config.author) {
    where.author = {
      OR: [
        { name: { contains: config.author } },
        { email: { contains: config.author } },
      ],
    }
  }

  if (config.dateFrom || config.dateTo) {
    where[dateField] = {
      ...(config.dateFrom ? { gte: config.dateFrom } : {}),
      ...(config.dateTo ? { lte: endOfDay(config.dateTo) } : {}),
    }
  }

  // Build select — exclude `content` (5-10KB per post) from list views
  const select: Record<string, unknown> = {
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
    author: {
      select: {
        id: true,
        name: true,
        ...(config.includeEmail ? { email: true } : {}),
      },
    },
  }

  if (config.includeStatus) {
    select.status = true
  }

  // PUBLISHED-only list: ensure publishedAt is not null (public routes only)
  const requirePublishedAt = config.requirePublishedAt !== false
  if (config.status === 'PUBLISHED' && requirePublishedAt) {
    where.publishedAt = {
      ...(where.publishedAt || {}),
      not: null,
    }
  }

  const [posts, total] = await Promise.all([
    prisma.post.findMany({ where, orderBy, select, skip, take: limit }),
    prisma.post.count({ where }),
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
}

/**
 * Parse query parameters from an H3Event into a PostQueryConfig.
 * Route handlers can spread this into queryPosts().
 *
 * Does NOT resolve limit — passes raw value so queryPosts can apply
 * route-specific defaults (defaultLimit).
 */
const VALID_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

export function parsePostQueryConfig(
  query: Record<string, unknown>,
  options?: { strictDateValidation?: boolean }
): PostQueryConfig {
  const rawStatus = normalizeString(query.status)
  const strict = options?.strictDateValidation ?? false
  return {
    status: rawStatus && VALID_STATUSES.has(rawStatus) ? rawStatus as PostQueryConfig['status'] : undefined,
    category: normalizeString(query.category),
    tag: normalizeString(query.tag),
    search: normalizeString(query.search),
    author: normalizeString(query.author),
    dateFrom: parseDateParam(query.dateFrom, strict),
    dateTo: parseDateParam(query.dateTo, strict),
    sortBy: normalizeString(query.sortBy),
    page: parsePage(query.page),
    limit: Number(query.limit) || undefined,
  }
}
