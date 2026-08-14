import { logger } from '~/lib/logger'
import { fetchQuote, type QuoteResponse } from '~/lib/yahoo-finance'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { requireUser } from '~/server/utils/auth'
import { Errors } from '~/lib/errors/factory'
import {
  buildMarketQuoteCacheKey,
  getMarketDataCacheTtlSeconds,
  getOrSetCached,
} from '~/lib/market-data/cache'

type Body = {
  symbols: string[]
}

const MAX_SYMBOLS_PER_REQUEST = 25
// Bounds pending-promise count at the handler level. The Yahoo request queue
// already caps actual upstream concurrency at 2; this keeps the handler from
// spinning up 25 promises at once for a full portfolio refresh.
const FETCH_CONCURRENCY = 3

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  requireUser(event)

  const body = await readBody<Body>(event)

  if (!body?.symbols || body.symbols.length === 0) {
    throw Errors.validationError([{ field: 'symbols', message: 'No symbols provided' }]).toH3Error()
  }

  if (body.symbols.length > MAX_SYMBOLS_PER_REQUEST) {
    throw Errors.validationError([{ field: 'symbols', message: `Maximum ${MAX_SYMBOLS_PER_REQUEST} symbols per request` }]).toH3Error()
  }

  const ip = getRateLimitIdentifier(event)
  try {
    await rateLimiters.generalApi(ip)
  } catch {
    throw Errors.rateLimited().toH3Error()
  }

  // dedupe + trim, preserving first-seen order. Normalisation matches the
  // quote cache key (uppercase) so case-variant tickers collapse to one fetch
  // and never race on the same cache slot.
  const seen = new Set<string>()
  const uniqueSymbols: string[] = []
  for (const raw of body.symbols) {
    const symbol = typeof raw === 'string' ? raw.trim() : ''
    if (!symbol) continue
    const dedupKey = symbol.toUpperCase()
    if (seen.has(dedupKey)) continue
    seen.add(dedupKey)
    uniqueSymbols.push(symbol)
  }

  const ttlSeconds = getMarketDataCacheTtlSeconds('quote')

  const result: Record<string, QuoteResponse> = {}
  const errors: string[] = []

  // bounded-concurrency pool — each symbol goes through the shared quote cache
  // so duplicate symbols (and repeated requests within TTL) never hit Yahoo twice
  const queue = [...uniqueSymbols]
  const workers = Array.from(
    { length: Math.min(FETCH_CONCURRENCY, queue.length) },
    async () => {
      while (queue.length > 0) {
        const symbol = queue.shift()
        if (symbol === undefined) break
        try {
          const quote = await getOrSetCached(
            buildMarketQuoteCacheKey(symbol),
            ttlSeconds,
            () => fetchQuote(symbol),
          )

          if (quote) {
            result[symbol] = quote
          } else {
            errors.push(symbol)
          }
        } catch (error) {
          log.warn('Failed to process stock price', { symbol, error })
          errors.push(symbol)
        }
      }
    },
  )

  await Promise.all(workers)

  if (Object.keys(result).length === 0) {
    throw Errors.externalServiceError(`Failed to fetch prices for all symbols. Errors: ${errors.join(', ')}`).toH3Error()
  }

  if (errors.length > 0) {
    log.warn('Some stock prices could not be fetched', {
      failedSymbols: errors,
    })
  }

  return result
})
