import adminMiddleware from '~/server/middleware/admin'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { queryPosts, parsePostQueryConfig } from '~/server/utils/post-queries'

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  await adminMiddleware(event)

  try {
    const config = parsePostQueryConfig(getQuery(event), { strictDateValidation: true })

    log.info('Fetching admin blog posts', { page: config.page, limit: config.limit, status: config.status })

    return queryPosts({
      ...config,
      dateField: 'createdAt',
      defaultSortBy: 'createdAt_desc',
      enableCategoryAliases: false,
      searchFields: ['title'],
      includeEmail: true,
      includeStatus: true,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
