import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
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
    log.error('Error deleting post', { error })
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete post',
    })
  }
})
