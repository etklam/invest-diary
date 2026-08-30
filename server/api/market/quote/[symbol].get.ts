/**
 * Market Quote API
 * Fetches real-time quote from Yahoo Finance API for any symbol
 * Rate limited to 60 requests per minute per IP
 */

import { getRateLimitIdentifier, rateLimiters } from '~/lib/rate-limiter'
import { Errors } from '~/lib/errors/factory'
import { getCachedQuote } from '~/lib/market-data/quote'
import { shouldBypassCache } from '~/lib/market-data/cache'
import { normalizeStockSymbol, parseSymbolParam } from '~/lib/stocks/symbols'

export default defineEventHandler(async (event) => {
  const rawSymbol = parseSymbolParam(event)
  const symbol = rawSymbol ? normalizeStockSymbol(rawSymbol) : undefined
  if (!symbol) {
    throw Errors.validationError([{ field: 'symbol', message: 'Missing symbol' }]).toH3Error()
  }

  const ip = getRateLimitIdentifier(event)
  try {
    await rateLimiters.yahooFinance(ip)
  } catch {
    throw Errors.rateLimited().toH3Error()
  }

  try {
    const query = getQuery(event) || {}
    return await getCachedQuote(symbol, shouldBypassCache(query.nocache))
  } catch {
    throw Errors.externalServiceError('Quote unavailable. Please try again later.').toH3Error()
  }
})
