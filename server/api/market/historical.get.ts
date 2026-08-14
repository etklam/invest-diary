/**
 * Market Historical API
 * Fetches historical data from Yahoo Finance API for any symbol and range
 * Rate limited to 60 requests per minute per IP
 */

import { fetchHistoricalData } from '~/lib/yahoo-finance'
import type { HistoricalQuote } from '~/lib/yahoo-finance'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { Errors } from '~/lib/errors/factory'
import {
  buildMarketHistoricalCacheKey,
  getMarketDataCacheTtlSeconds,
  getOrSetCached,
  shouldBypassCache,
} from '~/lib/market-data/cache'

export default defineEventHandler(async (event): Promise<HistoricalQuote[]> => {
  const query = getQuery(event) || {}
  const symbol = query.symbol as string
  const range = query.range as string || '1y' // Default to 1 year

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
    const cacheKey = buildMarketHistoricalCacheKey(symbol, range)
    const ttlSeconds = getMarketDataCacheTtlSeconds('historical')

    return await getOrSetCached(
      cacheKey,
      ttlSeconds,
      () => fetchHistoricalData(symbol, range),
      shouldBypassCache(query.nocache)
    )
  } catch {
    throw Errors.externalServiceError(`Historical data for ${symbol} unavailable. Please try again later.`).toH3Error()
  }
})
