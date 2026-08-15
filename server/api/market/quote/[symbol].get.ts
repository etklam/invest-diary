/**
 * Market Quote API
 * Fetches real-time quote from Yahoo Finance API for any symbol
 * Rate limited to 60 requests per minute per IP
 */

import type { H3Event } from 'h3'
import { getRateLimitIdentifier, rateLimiters } from '~/lib/rate-limiter'
import { Errors } from '~/lib/errors/factory'
import { getCachedQuote } from '~/lib/market-data/quote'
import { shouldBypassCache } from '~/lib/market-data/cache'

function resolveSymbol(event: H3Event): string | undefined {
  const rawSymbol = getRouterParam(event, 'symbol')

  if (!rawSymbol) {
    return undefined
  }

  try {
    return decodeURIComponent(String(rawSymbol))
  } catch {
    return String(rawSymbol)
  }
}

export default defineEventHandler(async (event) => {
  const symbol = resolveSymbol(event)
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
