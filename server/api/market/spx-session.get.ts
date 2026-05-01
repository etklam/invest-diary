import { fetchIntradayData, fetchQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import { buildSpxSessionSummary } from '~/lib/quicknote/market-session'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  requireUser(event)

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
    const [quote, intradayQuotes] = await Promise.all([
      fetchQuote('SPX'),
      fetchIntradayData('SPX', 3, '5m'),
    ])

    return buildSpxSessionSummary(quote, intradayQuotes)
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'SPX session unavailable. Please try again later.',
    })
  }
})
