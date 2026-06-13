import { fetchIntradayData, fetchQuote } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import { buildSpxSessionSummary } from '~/lib/quicknote/market-session'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import {
  buildMarketIntradayCacheKey,
  buildMarketQuoteCacheKey,
  getMarketDataCacheTtlSeconds,
  getOrSetCached,
} from '~/lib/market-data/cache'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  requireUser(event)

  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.yahooFinance(ip)
  } catch {
    throw Errors.rateLimited().toH3Error()
  }

  try {
    const [quote, intradayQuotes] = await Promise.all([
      getOrSetCached(
        buildMarketQuoteCacheKey('SPX'),
        getMarketDataCacheTtlSeconds('quote'),
        () => fetchQuote('SPX'),
      ),
      getOrSetCached(
        buildMarketIntradayCacheKey('SPX', 3, '5m'),
        300,
        () => fetchIntradayData('SPX', 3, '5m'),
      ),
    ])

    return buildSpxSessionSummary(quote, intradayQuotes)
  } catch {
    throw Errors.externalServiceError('SPX session unavailable. Please try again later.').toH3Error()
  }
})
