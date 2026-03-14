import prisma from '~/lib/prisma'
import adminMiddleware from '~/server/middleware/admin'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  // Check admin permission
  await adminMiddleware(event)

  const postId = parsePositiveBigIntParam(event, 'id')

  try {
    await prisma.post.delete({
      where: { id: postId }
    })

    console.log('[Blog] Post deleted:', postId.toString())
    return { success: true, message: 'Post deleted successfully' }
  } catch (error) {
    console.error('[Blog] Error deleting post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete post',
    })
  }
})
