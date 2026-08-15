import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { updateUserRoleAdmin } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)

  try {
    const userId = parsePositiveBigIntParam(event, 'id')
    const adminId = event.context.user?.id ?? ''

    const body = await readBody(event)
    const updatedUser = await updateUserRoleAdmin(userId, adminId, body)

    log.info('Updated user role', {
      adminId: event.context.user?.id,
      targetUserId: String(userId),
      newRole: updatedUser.role,
    })

    return serialize({ success: true, data: updatedUser })
  } catch (error) {
    handleApiError(error, log)
  }
})
