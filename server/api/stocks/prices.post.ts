import { logger } from '~/lib/logger'
import { fetchQuotesBounded } from '~/lib/market-data/quote'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { requireUser } from '~/server/utils/auth'
import { Errors } from '~/lib/errors/factory'

type Body = {
  symbols: string[]
}

const MAX_SYMBOLS_PER_REQUEST = 25

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  requireUser(event)

  const body = await readBody<Body>(event)

  if (!body?.symbols || body.symbols.length === 0) {
    throw Errors.validationError([{ field: 'symbols', message: 'No symbols provided' }]).toH3Error()
  }

  if (body.symbols.length > MAX_SYMBOLS_PER_REQUEST) {
    throw Errors.validationError([{ field: 'symbols', message: `Maximum ${MAX_SYMBOLS_PER_REQUEST} symbols per request` }]).toH3Error()
  }

  const ip = getRateLimitIdentifier(event)
  try {
    await rateLimiters.generalApi(ip)
  } catch {
    throw Errors.rateLimited().toH3Error()
  }

  // Bounded-concurrency batch read through the shared quote cache — trimming,
  // dedupe and the per-symbol error collection are seam invariants.
  const { quotes, errors } = await fetchQuotesBounded(body.symbols)

  if (quotes.size === 0) {
    throw Errors.externalServiceError(`Failed to fetch prices for all symbols. Errors: ${errors.join(', ')}`).toH3Error()
  }

  if (errors.length > 0) {
    log.warn('Some stock prices could not be fetched', {
      failedSymbols: errors,
    })
  }

  return Object.fromEntries(quotes)
})
