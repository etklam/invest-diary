import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import adminMiddleware from '~/server/middleware/admin'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { serializeBlogPost } from '~/server/utils/blog-response'

export default defineEventHandler(async (event) => {
  await adminMiddleware(event)

  const postId = parsePositiveBigIntParam(event, 'id')

  try {
    const post = await prisma.post.findUnique({
      where: { id: postId },
      include: {
        author: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    })

    if (!post) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Post not found',
      })
    }

    return serializeBlogPost(post)
  } catch (error) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }

    logger.blog.error('Admin: Error fetching post', { error })
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to fetch post',
    })
  }
})
