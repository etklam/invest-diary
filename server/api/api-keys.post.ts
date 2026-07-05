import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import { createApiKeyForUser } from '~/server/utils/api-key-queries'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    try {
      await rateLimiters.generalApi(getRateLimitIdentifier(event))
    } catch {
      log.warn('API key create rate limited', { userId: user.id })
      throw Errors.rateLimited(60).toH3Error()
    }

    const body = await readBody(event)
    const { key, rawKey } = await createApiKeyForUser(BigInt(user.id), body)

    return serialize({ key, rawKey })
  } catch (error) {
    handleApiError(error, log)
  }
})
