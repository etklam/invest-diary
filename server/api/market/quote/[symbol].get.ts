/**
 * Market Quote API
 * Fetches real-time quote from Yahoo Finance API for any symbol
 * Rate limited to 60 requests per minute per IP
 */

import type { H3Event } from 'h3'
import { fetchQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

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
    throw Errors.validationError([{ field: 'symbol', message: 'Missing symbol' }]).toH3Error()
  }

  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.yahooFinance(ip)
  } catch {
    throw Errors.rateLimited().toH3Error()
  }

  try {
    return await fetchQuote(symbol)
  } catch {
    throw Errors.externalServiceError('Quote unavailable. Please try again later.').toH3Error()
  }
})
