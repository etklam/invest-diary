import prisma from '~/lib/prisma'
import adminMiddleware from '~/server/middleware/admin'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.blog.withRequestId(event.context.requestId)
  await adminMiddleware(event)

  const body = await readBody(event)
  const ids = Array.isArray(body?.ids) ? body.ids : []

  if (ids.length === 0) {
    throw createError({
      statusCode: 400,
      statusMessage: 'No post ids provided'
    })
  }

  const result = await prisma.post.updateMany({
    where: {
      id: { in: ids }
    },
    data: {
      status: 'PUBLISHED',
      publishedAt: new Date()
    }
  })

  return {
    count: result.count
  }
})
