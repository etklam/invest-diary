import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { updateUserSettings } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    const body = await readBody(event)

    const settings = await updateUserSettings(BigInt(user.id), body)

    log.info('User settings updated', { userId: user.id })

    return { success: true, settings }
  } catch (error) {
    handleApiError(error, log)
  }
})
