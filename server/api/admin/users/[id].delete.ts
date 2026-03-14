import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  await adminMiddleware(event)

  try {
    const userId = parsePositiveBigIntParam(event, 'id')

    // Prevent self-deletion
    if (userId.toString() === event.context.user?.id) {
      throw createError({
        statusCode: 400,
        statusMessage: 'Cannot delete your own account'
      })
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      throw createError({
        statusCode: 404,
        statusMessage: 'User not found'
      })
    }

    // Delete user (cascade deletes will handle diaries, alerts, transactions)
    await prisma.user.delete({
      where: { id: userId }
    })

    console.log('[ADMIN] Delete user', {
      adminId: event.context.user?.id,
      deletedUserId: userId.toString(),
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
