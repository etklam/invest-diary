import { describe, expect, it, vi } from 'vitest'
import { SecMemoryCache } from '~/server/utils/sec-edgar/cache'

describe('SEC EDGAR memory cache', () => {
  it('returns fresh values and uses stale data only for retryable loader failures', async () => {
    let now = 0
    const cache = new SecMemoryCache<string, string>({ freshMs: 100, staleMs: 500, maxEntries: 2, now: () => now })
    const loader = vi.fn().mockResolvedValue('fresh')

    expect(await cache.getOrLoad('a', loader)).toMatchObject({ value: 'fresh', cacheStatus: 'miss', stale: false })
    expect(await cache.getOrLoad('a', loader)).toMatchObject({ value: 'fresh', cacheStatus: 'hit', stale: false })

    now = 150
    const fallback = await cache.getOrLoad('a', vi.fn().mockRejectedValue(Object.assign(new Error('down'), { retryable: true })))
    expect(fallback).toMatchObject({ value: 'fresh', cacheStatus: 'stale', stale: true })

    await expect(cache.getOrLoad('a', vi.fn().mockRejectedValue(new Error('invalid')))).rejects.toThrow('invalid')
  })

  it('evicts the least recently used entry', async () => {
    const cache = new SecMemoryCache<string, string>({ freshMs: 100, staleMs: 100, maxEntries: 2 })
    await cache.getOrLoad('a', async () => 'a')
    await cache.getOrLoad('b', async () => 'b')
    await cache.getOrLoad('a', async () => 'unused')
    await cache.getOrLoad('c', async () => 'c')
    expect(cache.has('a')).toBe(true)
    expect(cache.has('b')).toBe(false)
  })
})
