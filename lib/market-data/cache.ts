/**
 * Unified Market Data Cache
 *
 * Single entry point for all market data caching — quotes, historical, intraday,
 * sector board, and ETF research.  Under the hood the storage is the same
 * in-memory Map defined in `lib/etf-profile/cache.ts`; this module merely
 * re-exports the market-facing surface so callers never need to reach into
 * the etf-profile namespace.
 *
 * Why this exists
 * ───────────────
 * Market handlers were importing from `~/lib/etf-profile/cache` which is a
 * semantic mismatch.  Centralising the import path here also makes a future
 * migration to Redis a one-file change instead of touching N handlers.
 */

// ── Core cache primitives (re-exported from the underlying implementation) ──
export {
  getCached,
  getStaleCached,
  setCached,
  clearExpired,
  clearCache,
  getCacheSize,
  getOrSetCached,
  shouldBypassCache,
} from '~/lib/etf-profile/cache'

// ── Cache key builders ──────────────────────────────────────────────────────
export {
  buildMarketQuoteCacheKey,
  buildMarketHistoricalCacheKey,
  buildMarketIntradayCacheKey,
  buildEtfResearchCacheKey,
} from '~/lib/etf-profile/cache'

// ── Dynamic TTL helpers ─────────────────────────────────────────────────────
export {
  getMarketDataCacheTtlSeconds,
  getBoardCacheTtlSeconds,
} from '~/lib/etf-profile/cache'

// ── TTL baseline constants ──────────────────────────────────────────────────
// These are the fixed floor / ceiling values used by the dynamic TTL logic.
// Exported so that tests and callers can reason about freshness guarantees
// without hard-coding magic numbers.

/** Quote cache TTL during NYSE market hours (seconds) */
export const TTL_QUOTE_MARKET_HOURS = 5 * 60 // 5 min

/** Maximum TTL for any market data entry (seconds) */
export const TTL_MARKET_DATA_MAX = 24 * 60 * 60 // 24 h

/** Minimum TTL for any market data entry (seconds) */
export const TTL_MARKET_DATA_MIN = 60 // 1 min

/** Sector board cache TTL during market hours (seconds) */
export const TTL_BOARD_MARKET_HOURS = 15 * 60 // 15 min

/** Sector board cache TTL when all fetches failed (seconds) */
export const TTL_BOARD_ALL_FAILED = 5 * 60 // 5 min

/** Maximum number of entries the underlying Map will hold */
export const CACHE_MAX_ENTRIES = 500
