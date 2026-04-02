import { logger } from '~/lib/logger'
import { fetchQuote, type QuoteResponse } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import { requireUser } from '~/server/utils/auth'

type Body = {
  symbols: string[]
}

const MAX_SYMBOLS_PER_REQUEST = 25

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  requireUser(event)

  const body = await readBody<Body>(event)

  if (!body?.symbols || body.symbols.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'No symbols provided' })
  }

  if (body.symbols.length > MAX_SYMBOLS_PER_REQUEST) {
    throw createError({
      statusCode: 400,
      statusMessage: `Maximum ${MAX_SYMBOLS_PER_REQUEST} symbols per request`,
    })
  }

  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.generalApi(ip)
  } catch {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.',
    })
  }

  const result: Record<string, QuoteResponse> = {}
  const errors: string[] = []

  // Process symbols in parallel
  await Promise.all(
    body.symbols.map(async (symbol) => {
      try {
        const quote = await fetchQuote(symbol)

        if (quote) {
          result[symbol] = quote
        } else {
          errors.push(symbol)
        }
      } catch (error) {
        log.warn('Failed to process stock price', { symbol, error })
        errors.push(symbol)
      }
    })
  )

  if (Object.keys(result).length === 0) {
    throw createError({
      statusCode: 500,
      statusMessage: `Failed to fetch prices for all symbols. Errors: ${errors.join(', ')}`
    })
  }

  if (errors.length > 0) {
    log.warn('Some stock prices could not be fetched', {
      failedSymbols: errors,
    })
  }

  return result
})
