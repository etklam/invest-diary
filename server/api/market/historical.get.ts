/**
 * Market Historical API
 * Fetches historical data from Yahoo Finance API for any symbol and range
 * Rate limited to 60 requests per minute per IP
 */

import { fetchHistoricalData } from '~/lib/yahoo-finance'
import type { HistoricalQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event): Promise<HistoricalQuote[]> => {
  const log = logger.api.withRequestId(event.context.requestId)
  const symbol = getQuery(event).symbol as string
  const range = getQuery(event).range as string || '1y' // Default to 1 year

  if (!symbol) {
    throw Errors.validationError([{ field: 'symbol', message: 'Missing symbol' }]).toH3Error()
  }

  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.yahooFinance(ip)
  } catch {
    throw Errors.rateLimited().toH3Error()
  }

  try {
    return await fetchHistoricalData(symbol, range)
  } catch {
    throw Errors.externalServiceError(`Historical data for ${symbol} unavailable. Please try again later.`).toH3Error()
  }
})
