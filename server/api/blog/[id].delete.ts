import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  // Check admin permission
  const log = logger.blog.withRequestId(event.context.requestId)
  const postId = parsePositiveBigIntParam(event, 'id')

  try {
    await prisma.post.delete({
      where: { id: postId }
    })

    log.info('Post deleted', { postId: String(postId) })
    return { success: true, message: 'Post deleted successfully' }
  } catch (error) {
    handleApiError(error, log)
  }
})
