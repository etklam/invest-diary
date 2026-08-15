import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { blogPostInputSchema } from '~/server/utils/blog-schemas'
import { createPostForAdmin } from '~/server/utils/post-write'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  const userId = BigInt(event.context.user!.id)

  try {
    const body = await readBody(event)
    const input = blogPostInputSchema.parse(body)

    const post = await createPostForAdmin(input, userId)

    log.info('Post created', { postId: String(post.id), userId: String(userId) })
    return serialize(post)
  } catch (error) {
    handleApiError(error, log)
  }
})
