import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import adminMiddleware from '~/server/middleware/admin'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  // Check admin permission
  await adminMiddleware(event)

  const log = logger.blog.withRequestId(event.context.requestId)
  const postId = parsePositiveBigIntParam(event, 'id')

  try {
    await prisma.post.delete({
      where: { id: postId }
    })

    log.info('Post deleted', { postId: postId.toString() })
    return { success: true, message: 'Post deleted successfully' }
  } catch (error) {
    handleApiError(error, log)
  }
})
