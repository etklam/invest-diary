import adminMiddleware from '~/server/middleware/admin'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { queryPosts, parsePostQueryConfig } from '~/server/utils/post-queries'

const VALID_ADMIN_STATUSES = new Set(['DRAFT', 'PUBLISHED', 'ARCHIVED'])

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  await adminMiddleware(event)

  try {
    const rawQuery = getQuery(event)
    const rawStatus = typeof rawQuery.status === 'string' ? rawQuery.status.trim() : undefined
    if (rawStatus && !VALID_ADMIN_STATUSES.has(rawStatus)) {
      throw Errors.validationError([{ field: 'status', message: `Invalid status: ${rawStatus}` }])
    }

    const config = parsePostQueryConfig(rawQuery, { strictDateValidation: true })

    log.info('Fetching admin blog posts', { page: config.page, limit: config.limit, status: config.status })

    return queryPosts({
      ...config,
      dateField: 'createdAt',
      defaultSortBy: 'createdAt_desc',
      enableCategoryAliases: false,
      searchFields: ['title'],
      includeEmail: true,
      includeStatus: true,
      requirePublishedAt: false,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
