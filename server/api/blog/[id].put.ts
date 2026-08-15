import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { blogPostInputSchema } from '~/server/utils/blog-schemas'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { updatePostForAdmin } from '~/server/utils/post-write'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  const postId = parsePositiveBigIntParam(event, 'id')

  try {
    const body = await readBody(event)
    const input = blogPostInputSchema.parse(body)

    const post = await updatePostForAdmin(postId, input)

    log.info('Post updated', { postId: String(post.id) })
    return serialize(post)
  } catch (error) {
    handleApiError(error, log)
  }
})
