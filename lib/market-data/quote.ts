/**
 * Quote Read Seam
 *
 * Single entry point for reading Yahoo quotes through the shared market-data
 * cache. The cache key triple (key builder + dynamic TTL + fetcher) and the
 * batch concurrency cap live here as interface invariants, not per-handler
 * folklore.
 */

import { fetchQuote, type QuoteResponse } from '~/lib/yahoo-finance'
import { formatErrorContext, logger } from '~/lib/logger'
import {
  buildMarketQuoteCacheKey,
  getMarketDataCacheTtlSeconds,
  getOrSetCached,
} from '~/lib/market-data/cache'

/**
 * Single-symbol cached quote read: NYSE-aware dynamic TTL, stale-on-error.
 */
export function getCachedQuote(symbol: string, bypassCache = false): Promise<QuoteResponse> {
  return getOrSetCached(
    buildMarketQuoteCacheKey(symbol),
    getMarketDataCacheTtlSeconds('quote'),
    () => fetchQuote(symbol),
    bypassCache,
  )
}

/**
 * Bounds pending-promise count at the caller level. The Yahoo request queue
 * already caps actual upstream concurrency at 2; this keeps one handler from
 * spinning up a promise per symbol for a full portfolio refresh.
 */
export const QUOTE_FETCH_CONCURRENCY = 3

export interface QuoteBatch {
  quotes: Map<string, QuoteResponse>
  /** Symbols that failed with no stale cache available. */
  errors: string[]
}

/**
 * Batch quote read with a concurrency cap. Symbols are trimmed and deduped by
 * uppercase (matching the quote cache key) preserving first-seen order, so
 * case-variant tickers collapse to one fetch and never race on the same cache
 * slot. Per-symbol failures are collected, not thrown — a partial batch is
 * data quality, not a reason to discard the rest.
 */
export async function fetchQuotesBounded(symbols: string[]): Promise<QuoteBatch> {
  const seen = new Set<string>()
  const uniqueSymbols: string[] = []
  for (const raw of symbols) {
    const symbol = typeof raw === 'string' ? raw.trim() : ''
    if (!symbol) continue
    const dedupeKey = symbol.toUpperCase()
    if (seen.has(dedupeKey)) continue
    seen.add(dedupeKey)
    uniqueSymbols.push(symbol)
  }

  const quotes = new Map<string, QuoteResponse>()
  const errors: string[] = []
  const queue = [...uniqueSymbols]
  const workers = Array.from(
    { length: Math.min(QUOTE_FETCH_CONCURRENCY, queue.length) },
    async () => {
      while (queue.length > 0) {
        const symbol = queue.shift()
        if (symbol === undefined) break
        try {
          const quote = await getCachedQuote(symbol)
          if (quote) {
            quotes.set(symbol, quote)
          } else {
            errors.push(symbol)
          }
        } catch (error) {
          logger.stocks.warn('Quote fetch failed', {
            operation: 'quote_fetch',
            symbol,
            ...formatErrorContext(error),
          })
          errors.push(symbol)
        }
      }
    },
  )

  await Promise.all(workers)
  return { quotes, errors }
}
