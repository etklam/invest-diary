import adminMiddleware from '~/server/middleware/admin'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { deleteUserAdmin } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)
  await adminMiddleware(event)

  try {
    const userId = parsePositiveBigIntParam(event, 'id')
    const adminId = event.context.user?.id ?? ''

    const deleted = await deleteUserAdmin(userId, adminId)

    log.info('Deleted user', {
      adminId: event.context.user?.id,
      deletedUserId: String(userId),
      deletedUserEmail: deleted.email,
    })

    return {
      success: true,
      message: 'User deleted successfully'
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
