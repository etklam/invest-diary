import { nativeAuthResponseSchema, nativeLoginRequestSchema } from '~/lib/contracts/auth'
import { Errors } from '~/lib/errors/factory'
import { getRateLimitIdentifier, rateLimiters } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { loginNative } from '~/server/utils/native-auth-session'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const ip = getRateLimitIdentifier(event)
    try {
      await rateLimiters.authLoginIp(ip)
    } catch {
      throw Errors.rateLimited(60).toH3Error()
    }
    const input = nativeLoginRequestSchema.parse(await readBody(event))
    try {
      await rateLimiters.authLoginIdentity(input.email.trim().toLowerCase())
    } catch {
      throw Errors.rateLimited(60).toH3Error()
    }
    return nativeAuthResponseSchema.parse({ ok: true, data: await loginNative(input) })
  } catch (error) {
    handleApiError(error, log)
  }
})
