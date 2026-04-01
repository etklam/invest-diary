/**
 * Market Quote API
 * Fetches real-time quote from Yahoo Finance API for any symbol
 * Rate limited to 60 requests per minute per IP
 */

import { fetchQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'

export default defineEventHandler(async (event) => {
  const symbol = getRouterParam(event, 'symbol')
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
    return await fetchQuote(symbol)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'Quote unavailable. Please try again later.',
    })
  }
})
