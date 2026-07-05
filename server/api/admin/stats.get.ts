import adminMiddleware from '~/server/middleware/admin'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { getSystemStatsAdmin } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)
  await adminMiddleware(event)

  try {
    const data = await getSystemStatsAdmin()

    log.info('Got system stats', { userId: event.context.user?.id })

    return serialize({ success: true, data })
  } catch (error) {
    handleApiError(error, log)
  }
})
