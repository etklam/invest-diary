import { Errors } from '~/lib/errors/factory'

type RateLimitLogger = {
  warn: (message: string, meta?: Record<string, unknown>) => void
}

export async function enforceRateLimit(
  limitFn: (identifier: string) => Promise<void>,
  identifier: string,
  log: RateLimitLogger,
  message: string,
  meta: Record<string, unknown>
): Promise<void> {
  try {
    await limitFn(identifier)
  } catch {
    log.warn(message, meta)
    throw Errors.rateLimited(60)
  }
}
