import prisma from '~/lib/prisma'
import adminMiddleware from '~/server/middleware/admin'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  await adminMiddleware(event)

  const body = await readBody(event)
  const ids = Array.isArray(body?.ids) ? body.ids : []

  if (ids.length === 0) {
    throw Errors.validationError([{ field: 'ids', message: 'No post ids provided' }]).toH3Error()
  }

  const result = await prisma.post.deleteMany({
    where: {
      id: { in: ids }
    }
  })

  return {
    count: result.count
  }
})
