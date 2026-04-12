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
        status: 'PUBLISHED',
        publishedAt: new Date(),
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

    console.log('[Blog] Post published:', post.id)
    return serializeBlogPost(post)
  } catch (error) {
    console.error('[Blog] Error publishing post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to publish post',
    })
  }
})
