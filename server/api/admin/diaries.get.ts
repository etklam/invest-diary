import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { listAllDiariesAdmin } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)

  try {
    const query = getQuery(event)
    const { diaries, pagination } = await listAllDiariesAdmin(query)

    log.info('Listed all diaries', { userId: event.context.user?.id, count: diaries.length })

    return serialize({ success: true, data: diaries, pagination })
  } catch (error) {
    handleApiError(error, log)
  }
})
