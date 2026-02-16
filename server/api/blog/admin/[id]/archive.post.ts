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
    return post
  } catch (error) {
    console.error('[Blog] Error archiving post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to archive post',
    })
  }
})
