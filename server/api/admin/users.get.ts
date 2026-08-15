import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { listUsersAdmin } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)

  try {
    const query = getQuery(event)
    const { users, pagination } = await listUsersAdmin(query)

    log.info('Listed users', { userId: event.context.user?.id, count: users.length })

    return serialize({ success: true, data: users, pagination })
  } catch (error) {
    handleApiError(error, log)
  }
})
