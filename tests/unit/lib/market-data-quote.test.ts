import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCache } from '~/lib/market-data/cache'
import type { QuoteResponse } from '~/lib/yahoo-finance'

const mockFetchQuote = vi.hoisted(() => vi.fn())

vi.mock('~/lib/yahoo-finance', () => ({
  fetchQuote: mockFetchQuote,
}))

import {
  fetchQuotesBounded,
  getCachedQuote,
  QUOTE_FETCH_CONCURRENCY,
} from '~/lib/market-data/quote'

const quote = (symbol: string, price = 10): QuoteResponse => ({
  symbol,
  regularMarketPrice: price,
  previousClose: price,
  change: 0,
  changePercent: 0,
  currency: 'USD',
  marketState: 'REGULAR',
  lastUpdateTime: '2026-08-10T12:00:00.000Z',
})

describe('quote read seam', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCache()
  })

  describe('fetchQuotesBounded', () => {
    it('bounds in-flight fetchQuote calls at QUOTE_FETCH_CONCURRENCY', async () => {
      let inFlight = 0
      let maxInFlight = 0
      mockFetchQuote.mockImplementation(async (symbol: string) => {
        inFlight += 1
        maxInFlight = Math.max(maxInFlight, inFlight)
        await new Promise(resolve => setTimeout(resolve, 5))
        inFlight -= 1
        return quote(symbol)
      })

      const symbols = Array.from({ length: QUOTE_FETCH_CONCURRENCY * 3 }, (_, i) => `SYM${i}`)
      const batch = await fetchQuotesBounded(symbols)

      expect(maxInFlight).toBeLessThanOrEqual(QUOTE_FETCH_CONCURRENCY)
      expect(batch.quotes.size).toBe(symbols.length)
      expect(batch.errors).toEqual([])
    })

    it('collects per-symbol failures without discarding the rest of the batch', async () => {
      mockFetchQuote.mockImplementation(async (symbol: string) => {
        if (symbol === 'BAD') throw new Error('no quote')
        return quote(symbol)
      })

      const batch = await fetchQuotesBounded(['AAPL', 'BAD', 'MSFT'])

      expect([...batch.quotes.keys()].sort()).toEqual(['AAPL', 'MSFT'])
      expect(batch.errors).toEqual(['BAD'])
    })

    it('treats a falsy quote as a per-symbol error', async () => {
      mockFetchQuote.mockImplementation(async (symbol: string) =>
        symbol === 'EMPTY' ? null : quote(symbol),
      )

      const batch = await fetchQuotesBounded(['AAPL', 'EMPTY'])

      expect([...batch.quotes.keys()]).toEqual(['AAPL'])
      expect(batch.errors).toEqual(['EMPTY'])
    })

    it('trims, dedupes case-insensitively and drops empty symbols', async () => {
      mockFetchQuote.mockImplementation(async (symbol: string) => quote(symbol))

      const batch = await fetchQuotesBounded(['aapl', ' AAPL ', '', 'TSLA'])

      expect(mockFetchQuote).toHaveBeenCalledTimes(2)
      expect([...batch.quotes.keys()].sort()).toEqual(['TSLA', 'aapl'])
      expect(batch.errors).toEqual([])
    })

    it('returns an empty batch for empty input', async () => {
      const batch = await fetchQuotesBounded([])

      expect(batch.quotes.size).toBe(0)
      expect(batch.errors).toEqual([])
      expect(mockFetchQuote).not.toHaveBeenCalled()
    })
  })

  describe('getCachedQuote', () => {
    it('caches per symbol so a second read does not re-fetch', async () => {
      mockFetchQuote.mockImplementation(async (symbol: string) => quote(symbol, 100))

      const first = await getCachedQuote('AAPL')
      const second = await getCachedQuote('aapl') // same normalized cache key

      expect(mockFetchQuote).toHaveBeenCalledTimes(1)
      expect(second).toEqual(first)
    })

    it('re-fetches when bypassCache is set', async () => {
      mockFetchQuote.mockResolvedValueOnce(quote('AAPL', 100))
      mockFetchQuote.mockResolvedValueOnce(quote('AAPL', 101))

      await getCachedQuote('AAPL')
      const fresh = await getCachedQuote('AAPL', true)

      expect(mockFetchQuote).toHaveBeenCalledTimes(2)
      expect(fresh.regularMarketPrice).toBe(101)
    })

    it('propagates fetch failures with no stale cache', async () => {
      mockFetchQuote.mockRejectedValue(new Error('provider down'))

      await expect(getCachedQuote('AAPL')).rejects.toThrow('no stale cache')
    })
  })
})
