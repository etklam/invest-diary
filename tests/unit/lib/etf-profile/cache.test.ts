import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest'
import {
  buildMarketHistoricalCacheKey,
  buildMarketQuoteCacheKey,
  clearCache,
  getBoardCacheTtlSeconds,
  getCached,
  getMarketDataCacheTtlSeconds,
  setCached,
  shouldBypassCache,
} from '~/lib/etf-profile/cache'

describe('etf profile cache', () => {
  beforeEach(() => {
    clearCache()
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('expires values by ttl', () => {
    setCached('k', { ok: true }, 1)

    vi.advanceTimersByTime(1100)

    expect(getCached('k')).toBeNull()
  })

  it('builds stable market data cache keys', () => {
    expect(buildMarketQuoteCacheKey(' spy ')).toBe('market:quote:SPY')
    expect(buildMarketHistoricalCacheKey(' spy ', ' 1y ')).toBe('market:historical:SPY:1y')
  })

  it('recognizes cache bypass query values', () => {
    expect(shouldBypassCache('1')).toBe(true)
    expect(shouldBypassCache('true')).toBe(true)
    expect(shouldBypassCache(undefined)).toBe(false)
  })

  it('uses short ttl for quotes during market hours', () => {
    const ttl = getMarketDataCacheTtlSeconds('quote', new Date('2026-05-18T15:00:00.000Z'))

    expect(ttl).toBe(300)
  })

  it('caps weekend market data ttl at 24 hours', () => {
    const ttl = getMarketDataCacheTtlSeconds('historical', new Date('2026-05-16T16:00:00.000Z'))

    expect(ttl).toBe(24 * 60 * 60)
  })

  describe('getBoardCacheTtlSeconds', () => {
    it('returns 5 minutes when all failed', () => {
      const ttl = getBoardCacheTtlSeconds(true, new Date('2026-05-18T15:00:00.000Z'))

      expect(ttl).toBe(5 * 60)
    })

    it('returns 5 minutes when all failed even outside market hours', () => {
      const ttl = getBoardCacheTtlSeconds(true, new Date('2026-05-18T20:00:00.000Z'))

      expect(ttl).toBe(5 * 60)
    })

    it('returns 15 minutes during market hours on a weekday', () => {
      // Monday 2026-05-18 at 11:00 ET (15:00 UTC in May = EDT UTC-4)
      const ttl = getBoardCacheTtlSeconds(false, new Date('2026-05-18T15:00:00.000Z'))

      expect(ttl).toBe(15 * 60)
    })

    it('returns until next trading day when outside market hours', () => {
      // Monday 2026-05-18 at 22:00 UTC = 18:00 ET (after market close)
      const ttl = getBoardCacheTtlSeconds(false, new Date('2026-05-18T22:00:00.000Z'))

      // Should be capped at 24h max
      expect(ttl).toBeLessThanOrEqual(24 * 60 * 60)
      expect(ttl).toBeGreaterThan(15 * 60)
    })

    it('caps board cache ttl at 24 hours on weekends', () => {
      const ttl = getBoardCacheTtlSeconds(false, new Date('2026-05-16T16:00:00.000Z'))

      expect(ttl).toBe(24 * 60 * 60)
    })
  })
})
