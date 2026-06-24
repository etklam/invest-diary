import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import adminMiddleware from '~/server/middleware/admin'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { serialize } from '~/server/utils/serialize'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
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
      throw Errors.blogNotFound(postId.toString()).toH3Error()
    }

    return serialize(post)
  } catch (error) {
    handleApiError(error, log)
  }
})
