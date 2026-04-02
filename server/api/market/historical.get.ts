/**
 * Market Historical API
 * Fetches historical data from Yahoo Finance API for any symbol and range
 * Rate limited to 60 requests per minute per IP
 */

import { fetchHistoricalData } from '~/lib/yahoo-finance'
import type { HistoricalQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'

export default defineEventHandler(async (event): Promise<HistoricalQuote[]> => {
  const symbol = getQuery(event).symbol as string
  const range = getQuery(event).range as string || '1y' // Default to 1 year

  if (!symbol) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Missing symbol',
    })
  }

  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.yahooFinance(ip)
  } catch {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.',
    })
  }

  try {
    return await fetchHistoricalData(symbol, range)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: `Historical data for ${symbol} unavailable. Please try again later.`,
    })
  }
})
