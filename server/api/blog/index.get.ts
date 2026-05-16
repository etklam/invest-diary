import type { H3Event } from 'h3'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { queryPosts, parsePostQueryConfig, PUBLIC_DEFAULT_LIMIT } from '~/server/utils/post-queries'

export default defineEventHandler(async (event: H3Event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  try {
    const config = parsePostQueryConfig(getQuery(event), { strictDateValidation: true })

    log.info('Fetching public blog posts', { page: config.page, limit: config.limit })

    // Public route: strip author filter to prevent email enumeration
    const { author: _author, ...publicConfig } = config

    return queryPosts({
      ...publicConfig,
      status: 'PUBLISHED',
      dateField: 'publishedAt',
      defaultSortBy: 'publishedAt_desc',
      defaultLimit: PUBLIC_DEFAULT_LIMIT,
      enableCategoryAliases: true,
      searchFields: ['title', 'excerpt'],
      searchMode: 'search',
      includeEmail: false,
      includeStatus: false,
    })
  } catch (error: any) {
    if (error?.statusCode) {
      throw error
    }

    log.error('Error fetching posts', { error: String(error) })

    throw Errors.internalError(error).toH3Error()
  }
})
