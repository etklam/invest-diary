import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { serialize } from '~/server/utils/serialize'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { setPostStatus } from '~/server/utils/post-write'

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  // Check admin permission
  const postId = parsePositiveBigIntParam(event, 'id')

  try {
    const post = await setPostStatus(postId, 'PUBLISHED')

    log.info('Post published', { postId: String(post.id) })
    return serialize(post)
  } catch (error) {
    handleApiError(error, log)
  }
})
