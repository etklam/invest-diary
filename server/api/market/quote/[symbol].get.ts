/**
 * Market Quote API
 * Fetches real-time quote from Yahoo Finance API for any symbol
 * Rate limited to 60 requests per minute per IP
 */

import type { H3Event } from 'h3'
import { fetchQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'

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
  const log = logger.api.withRequestId(event.context.requestId)
  const symbol = resolveSymbol(event)
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
