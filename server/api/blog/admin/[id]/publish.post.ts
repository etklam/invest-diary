import prisma from '~/lib/prisma'
import adminMiddleware from '~/server/middleware/admin'

export default defineEventHandler(async (event) => {
  // Check admin permission
  await adminMiddleware(event)

  const id = getRouterParam(event, 'id')

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID is required',
    })
  }

  try {
    const post = await prisma.post.update({
      where: { id: BigInt(id) },
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
    return post
  } catch (error) {
    console.error('[Blog] Error publishing post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to publish post',
    })
  }
})
