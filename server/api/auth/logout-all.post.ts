import { authMutationResponseSchema } from '~/lib/contracts/auth'
import { clearAuthCookies, requireUser } from '~/server/utils/auth'
import { logoutAllSessions } from '~/server/utils/user-queries'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)
    await logoutAllSessions(BigInt(user.id))
    clearAuthCookies(event)
    return authMutationResponseSchema.parse({ ok: true })
  } catch (error) {
    handleApiError(error, log)
  }
})
