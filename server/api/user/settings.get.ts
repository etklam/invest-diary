import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { getUserSettings } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    const settings = await getUserSettings(BigInt(user.id))

    return { success: true, settings }
  } catch (error) {
    handleApiError(error, log)
  }
})
