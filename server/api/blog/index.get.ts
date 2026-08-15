import type { H3Event } from 'h3'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { queryPostsPublic } from '~/server/utils/post-queries'

export default defineEventHandler(async (event: H3Event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  try {
    const query = getQuery(event)

    log.info('Fetching public blog posts', { page: query.page, limit: query.limit })

    return queryPostsPublic(query)
  } catch (error: unknown) {
    handleApiError(error, log)
  }
})
