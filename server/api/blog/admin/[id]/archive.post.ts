import prisma from '~/lib/prisma'
import adminMiddleware from '~/server/middleware/admin'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { serialize } from '~/server/utils/serialize'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
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

    log.info('Post archived', { postId: String(post.id) })
    return serialize(post)
  } catch (error) {
    handleApiError(error, log)
  }
})
