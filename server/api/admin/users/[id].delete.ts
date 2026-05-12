import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)
  await adminMiddleware(event)

  try {
    const userId = parsePositiveBigIntParam(event, 'id')

    // Prevent self-deletion
    if (userId.toString() === event.context.user?.id) {
      throw Errors.accountSelfModification('delete your own account').toH3Error()
    }

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!existingUser) {
      throw Errors.userNotFound().toH3Error()
    }

    // Delete user (cascade deletes will handle diaries, alerts, transactions)
    await prisma.user.delete({
      where: { id: userId }
    })

    log.info('Deleted user', {
      adminId: event.context.user?.id,
      deletedUserId: userId.toString(),
      deletedUserEmail: existingUser.email
    })

    return {
      success: true,
      message: 'User deleted successfully'
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
