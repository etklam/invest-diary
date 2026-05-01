import { logger } from '~/lib/logger'
import { getRateLimitIdentifier, rateLimiters } from '~/lib/rate-limiter'
import { Errors } from '~/lib/errors/factory'

const RATE_LIMITED_PREFIXES = [
  '/api/admin',
  '/api/blog/admin',
  '/api/api-keys',
  '/api/diaries',
  '/api/partners',
]

export default defineEventHandler(async (event) => {
  const path = event.path || getRequestURL(event).pathname
  if (!path.startsWith('/api/')) return

  if (!RATE_LIMITED_PREFIXES.some((prefix) => path.startsWith(prefix))) return

  const identifier = getRateLimitIdentifier(event)
  try {
    await rateLimiters.generalApi(identifier)
  } catch {
    logger.api.withRequestId(event.context.requestId).warn('General API rate limited', {
      path,
      ip: identifier,
    })
    throw Errors.rateLimited(60).toH3Error()
  }
})
