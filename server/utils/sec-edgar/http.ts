import type { H3Event } from 'h3'
import { setHeader } from 'h3'
import { logger } from '~/lib/logger'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { SecProviderError } from './errors'

export type SecRateLimitKind = 'metadata' | 'download' | 'package' | 'batch'

export function secRequestLog(event: H3Event) {
  return logger.sec.withRequestId(event.context.requestId)
}

export async function enforceSecRateLimit(event: H3Event, kind: SecRateLimitKind): Promise<void> {
  const identifier = getRateLimitIdentifier(event)
  const limiter = kind === 'metadata' ? rateLimiters.secMetadata : kind === 'download' ? rateLimiters.secDownload : kind === 'package' ? rateLimiters.secPackage : rateLimiters.secBatch
  try {
    await limiter(identifier)
  } catch (error) {
    const milliseconds = Number((error as { msBeforeNext?: unknown }).msBeforeNext ?? 60_000)
    const retryAfter = Math.max(1, Math.ceil(milliseconds / 1000))
    setHeader(event, 'Retry-After', retryAfter)
    throw Errors.secProvider('SEC_RATE_LIMITED', 429, 'SEC filings rate limit exceeded', [{ message: `Retry after ${retryAfter} seconds` }])
  }
}

export function handleSecApiError(error: unknown, log: ReturnType<typeof secRequestLog>): never {
  if (error instanceof SecProviderError) {
    throw Errors.secProvider(error.code, error.statusCode, error.message, error.retryAfterSeconds ? [{ message: `Retry after ${error.retryAfterSeconds} seconds` }] : undefined).toH3Error()
  }
  handleApiError(error, log)
}
