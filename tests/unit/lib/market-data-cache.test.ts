import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  buildMarketHistoricalCacheKey,
  buildMarketQuoteCacheKey,
  clearCache,
  getCached,
  getOrSetCached,
  getCacheSize,
  setCached,
  shouldBypassCache,
  TTL_QUOTE_MARKET_HOURS,
  TTL_MARKET_DATA_MAX,
  TTL_MARKET_DATA_MIN,
  TTL_BOARD_MARKET_HOURS,
  TTL_BOARD_ALL_FAILED,
  CACHE_MAX_ENTRIES,
} from '~/lib/market-data/cache'

describe('market-data/cache (unified seam)', () => {
  beforeEach(() => {
    clearCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  // ── getOrSetCached ──────────────────────────────────────────────────────

  describe('getOrSetCached', () => {
    it('calls fetcher and caches the result on cache miss', async () => {
      const fetcher = vi.fn().mockResolvedValue({ price: 42 })

      const result = await getOrSetCached('test:key', 60, fetcher)

      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ price: 42 })
    })

    it('returns cached value without calling fetcher on cache hit', async () => {
      const fetcher = vi.fn().mockResolvedValue({ price: 42 })

      await getOrSetCached('test:key', 60, fetcher)
      const result = await getOrSetCached('test:key', 60, fetcher)

      expect(fetcher).toHaveBeenCalledTimes(1)
      expect(result).toEqual({ price: 42 })
    })

    it('bypasses cache when bypass=true', async () => {
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ price: 42 })
        .mockResolvedValueOnce({ price: 43 })

      await getOrSetCached('test:key', 60, fetcher)
      const result = await getOrSetCached('test:key', 60, fetcher, true)

      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ price: 43 })
    })

    it('returns stale value when fetcher fails', async () => {
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ price: 42 })
        .mockRejectedValueOnce(new Error('network error'))

      await getOrSetCached('test:key', 1, fetcher)

      // Expire the cache entry
      vi.advanceTimersByTime(2000)

      // Fetcher fails, but stale value should be returned
      const result = await getOrSetCached('test:key', 1, fetcher)

      expect(result).toEqual({ price: 42 })
    })

    it('throws when fetcher fails and no stale value exists', async () => {
      const fetcher = vi.fn().mockRejectedValue(new Error('network error'))

      await expect(
        getOrSetCached('test:nope', 60, fetcher)
      ).rejects.toThrow('Fetch failed and no stale cache available')
    })
  })

  // ── Cache key builders ─────────────────────────────────────────────────

  describe('cache key builders', () => {
    it('builds quote cache keys with normalized symbol', () => {
      expect(buildMarketQuoteCacheKey(' spy ')).toBe('market:quote:SPY')
      expect(buildMarketQuoteCacheKey('AAPL')).toBe('market:quote:AAPL')
      expect(buildMarketQuoteCacheKey('  ^GSPC  ')).toBe('market:quote:^GSPC')
    })

    it('builds historical cache keys with normalized symbol and range', () => {
      expect(buildMarketHistoricalCacheKey(' spy ', ' 1y ')).toBe('market:historical:SPY:1y')
      expect(buildMarketHistoricalCacheKey('AAPL', '3m')).toBe('market:historical:AAPL:3m')
    })
  })

  // ── shouldBypassCache ──────────────────────────────────────────────────

  describe('shouldBypassCache', () => {
    it('recognizes truthy bypass values', () => {
      expect(shouldBypassCache('1')).toBe(true)
      expect(shouldBypassCache(1)).toBe(true)
      expect(shouldBypassCache(true)).toBe(true)
      expect(shouldBypassCache('true')).toBe(true)
    })

    it('rejects falsy and unexpected values', () => {
      expect(shouldBypassCache(undefined)).toBe(false)
      expect(shouldBypassCache('0')).toBe(false)
      expect(shouldBypassCache(0)).toBe(false)
      expect(shouldBypassCache(false)).toBe(false)
      expect(shouldBypassCache('')).toBe(false)
      expect(shouldBypassCache(null)).toBe(false)
    })
  })

  // ── TTL constants ──────────────────────────────────────────────────────

  describe('TTL constants', () => {
    it('all TTL constants are positive numbers', () => {
      expect(TTL_QUOTE_MARKET_HOURS).toBeGreaterThan(0)
      expect(TTL_MARKET_DATA_MAX).toBeGreaterThan(0)
      expect(TTL_MARKET_DATA_MIN).toBeGreaterThan(0)
      expect(TTL_BOARD_MARKET_HOURS).toBeGreaterThan(0)
      expect(TTL_BOARD_ALL_FAILED).toBeGreaterThan(0)
    })

    it('min TTL is smaller than max TTL', () => {
      expect(TTL_MARKET_DATA_MIN).toBeLessThan(TTL_MARKET_DATA_MAX)
    })

    it('board market hours TTL is larger than all-failed TTL', () => {
      expect(TTL_BOARD_MARKET_HOURS).toBeGreaterThan(TTL_BOARD_ALL_FAILED)
    })

    it('cache max entries is a positive number', () => {
      expect(CACHE_MAX_ENTRIES).toBeGreaterThan(0)
    })
  })

  // ── Cache expiry ───────────────────────────────────────────────────────

  describe('cache expiry', () => {
    it('expires entries after TTL', () => {
      setCached('k', { ok: true }, 1)

      vi.advanceTimersByTime(1100)

      expect(getCached('k')).toBeNull()
    })

    it('returns value before TTL expires', () => {
      setCached('k', { ok: true }, 60)

      vi.advanceTimersByTime(30000)

      expect(getCached('k')).toEqual({ ok: true })
    })

    it('expired entries are re-fetched by getOrSetCached', async () => {
      const fetcher = vi.fn()
        .mockResolvedValueOnce({ v: 1 })
        .mockResolvedValueOnce({ v: 2 })

      await getOrSetCached('expire-test', 1, fetcher)

      vi.advanceTimersByTime(2000)

      const result = await getOrSetCached('expire-test', 1, fetcher)

      expect(fetcher).toHaveBeenCalledTimes(2)
      expect(result).toEqual({ v: 2 })
    })
  })

  // ── Cache size ─────────────────────────────────────────────────────────

  describe('getCacheSize', () => {
    it('tracks cache entries', () => {
      expect(getCacheSize()).toBe(0)

      setCached('a', 1)
      setCached('b', 2)

      expect(getCacheSize()).toBe(2)
    })

    it('decreases after clearing', () => {
      setCached('a', 1)
      clearCache()

      expect(getCacheSize()).toBe(0)
    })
  })
})
