import { nativeAuthResponseSchema, nativeRefreshRequestSchema } from '~/lib/contracts/auth'
import { Errors } from '~/lib/errors/factory'
import { getRateLimitIdentifier, rateLimiters } from '~/lib/rate-limiter'
import { sha256Hex } from '~/server/utils/hash'
import { rotateNativeRefreshToken } from '~/server/utils/native-auth-session'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const input = nativeRefreshRequestSchema.parse(await readBody(event))
    try {
      await Promise.all([
        rateLimiters.authRefreshIp(getRateLimitIdentifier(event)),
        rateLimiters.authRefreshIdentity(sha256Hex(input.refreshToken).slice(0, 24)),
      ])
    } catch {
      throw Errors.rateLimited(60).toH3Error()
    }
    return nativeAuthResponseSchema.parse({
      ok: true,
      data: await rotateNativeRefreshToken(input.refreshToken),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
