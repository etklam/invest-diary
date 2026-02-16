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
    await prisma.post.delete({
      where: { id: BigInt(id) }
    })

    console.log('[Blog] Post deleted:', id)
    return { success: true, message: 'Post deleted successfully' }
  } catch (error) {
    console.error('[Blog] Error deleting post:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to delete post',
    })
  }
})
