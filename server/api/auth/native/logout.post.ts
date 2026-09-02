import { authMutationResponseSchema, nativeLogoutRequestSchema } from '~/lib/contracts/auth'
import { logoutNativeFamily } from '~/server/utils/native-auth-session'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const input = nativeLogoutRequestSchema.parse(await readBody(event))
    await logoutNativeFamily(input.refreshToken)
    return authMutationResponseSchema.parse({ ok: true })
  } catch (error) {
    handleApiError(error, log)
  }
})
