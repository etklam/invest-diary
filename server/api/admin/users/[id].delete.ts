import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  await adminMiddleware(event)

  try {
    const userId = getRouterParam(event, 'id')
    if (!userId) {
      throw createError({
        statusCode: 400,
        statusMessage: 'User ID is required'
      })
    }

    // Prevent self-deletion
    if (userId === event.context.user?.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete your own account'
      })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: BigInt(userId) }
    })

    if (!existingUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Delete user (cascade deletes will handle diaries, alerts, transactions)
    await prisma.user.delete({
      where: { id: BigInt(userId) }
    })

    console.log('[ADMIN] Delete user', {
      adminId: event.context.user?.id,
      deletedUserId: userId,
      deletedUserEmail: existingUser.email
    })

    return {
      success: true,
      message: 'User deleted successfully'
    }
  } catch (error) {
    console.error('[ADMIN] Delete user error:', error)
    throw error
  }
})
