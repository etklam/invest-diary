/**
 * ETF Quote API
 * Fetches real-time quote from Yahoo Finance API
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

  // Rate limiting
  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.yahooFinance(ip)
  } catch (rateLimiterRes) {
    throw createError({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.',
    })
  }

  try {
    const quote = await fetchQuote(symbol)
    return quote
  } catch (error) {
    throw createError({
      statusCode: 502,
      statusMessage: 'Yahoo quote unavailable. Please try again later.',
    })
  }
})
