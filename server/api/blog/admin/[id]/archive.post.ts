import prisma from '~/lib/prisma'
import adminMiddleware from '~/server/middleware/admin'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { serializeBlogPost } from '~/server/utils/blog-response'

export default defineEventHandler(async (event) => {
  // Check admin permission
  await adminMiddleware(event)

  const postId = parsePositiveBigIntParam(event, 'id')

  try {
    const post = await prisma.post.update({
      where: { id: postId },
      data: {
        status: 'ARCHIVED',
        publishedAt: null,
      },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    console.log('[Blog] Post archived:', post.id)
    return serializeBlogPost(post)
  } catch (error) {
    console.error('[Blog] Error archiving post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to archive post',
    })
  }
})
