import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { queryPostsAdmin } from '~/server/utils/post-queries'

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  try {
    const query = getQuery(event)

    log.info('Fetching admin blog posts', { page: query.page, limit: query.limit, status: query.status })

    return queryPostsAdmin(query)
  } catch (error) {
    handleApiError(error, log)
  }
})
