/**
 * ETF Quote API
 * Fetches real-time quote from Yahoo Finance API
 * Rate limited to 60 requests per minute per IP
 */

import { fetchQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import {
  buildMarketQuoteCacheKey,
  getMarketDataCacheTtlSeconds,
  getOrSetCached,
  shouldBypassCache,
} from '~/lib/etf-profile/cache'

export default defineEventHandler(async (event) => {
  const log = logger.etf.withRequestId(event.context.requestId)
  const symbol = getRouterParam(event, 'symbol')
  if (!symbol) {
    throw Errors.validationError([{ field: 'symbol', message: 'Missing symbol' }]).toH3Error()
  }

  // Rate limiting
  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.yahooFinance(ip)
  } catch {
    throw Errors.rateLimited().toH3Error()
  }

  try {
    const query = getQuery(event) || {}
    const quote = await getOrSetCached(
      buildMarketQuoteCacheKey(symbol),
      getMarketDataCacheTtlSeconds('quote'),
      () => fetchQuote(symbol),
      shouldBypassCache(query.nocache)
    )
    return quote
  } catch {
    throw Errors.externalServiceError('Yahoo quote unavailable. Please try again later.').toH3Error()
  }
})
