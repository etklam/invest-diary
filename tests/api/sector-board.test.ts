import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery } from '../vi-setup'

// ── Yahoo Finance mock ────────────────────────────────────────────────
const mockFetchHistoricalData = vi.fn()
const mockFetchQuote = vi.fn()

vi.mock('~/lib/yahoo-finance', () => ({
  fetchHistoricalData: mockFetchHistoricalData,
  fetchQuote: mockFetchFetchQuote,
}))

// Fix the mock export name
vi.mock('~/lib/yahoo-finance', () => ({
  fetchHistoricalData: (...args: any[]) => mockFetchHistoricalData(...args),
  fetchQuote: (...args: any[]) => mockFetchQuote(...args),
}))

// ── Rate limiter mock ─────────────────────────────────────────────────
const mockRateLimiterFn = vi.fn()
vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    yahooFinance: mockRateLimiterFn,
  },
}))

// ── Logger mock ───────────────────────────────────────────────────────
const mockApiLog = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
vi.mock('~/lib/logger', () => ({
  logger: {
    api: { withRequestId: vi.fn(() => mockApiLog) },
  },
}))

// ── Cache mock ────────────────────────────────────────────────────────
const mockGetCached = vi.fn()
const mockSetCached = vi.fn()
const mockGetOrSetCached = vi.fn()
const mockGetStaleCached = vi.fn()

vi.mock('~/lib/market-data/cache', () => ({
  buildMarketHistoricalCacheKey: (symbol: string, range: string) => `market:historical:${symbol}:${range}`,
  buildMarketQuoteCacheKey: (symbol: string) => `market:quote:${symbol}`,
  getBoardCacheTtlSeconds: (allFailed: boolean) => allFailed ? 300 : 900,
  getMarketDataCacheTtlSeconds: () => 300,
  getCached: (...args: any[]) => mockGetCached(...args),
  getOrSetCached: (...args: any[]) => mockGetOrSetCached(...args),
  getStaleCached: (...args: any[]) => mockGetStaleCached(...args),
  setCached: (...args: any[]) => mockSetCached(...args),
  shouldBypassCache: (v: unknown) => v === '1' || v === 1 || v === true || v === 'true',
}))

// ── Import handler ────────────────────────────────────────────────────
let handler: any

beforeEach(async () => {
  vi.clearAllMocks()
  mockRateLimiterFn.mockResolvedValue(undefined)

  // Default: per-symbol cache returns the fetcher result
  mockGetOrSetCached.mockImplementation(async (_key: string, _ttl: number, fetcher: () => Promise<any>) => fetcher())
  // Default: board cache miss
  mockGetCached.mockReturnValue(null)
  mockGetStaleCached.mockReturnValue(null)

  handler = (await import('~/server/api/market/sector-board.get')).default
})

function makeEvent(query: Record<string, string> = {}) {
  mockGetQuery.mockReturnValue(query)
  return {
    context: { requestId: 'test-req-id' },
  }
}

// Mock getRequestIP globally (H3 auto-import)
beforeEach(() => {
  global.getRequestIP = vi.fn(() => '127.0.0.1')
})

function makeHistoricalData(closePrices: number[]) {
  return closePrices.map((close, i) => ({
    timestamp: 1700000000 + i * 86400,
    close,
  }))
}

describe('GET /api/market/sector-board', () => {
  it('returns rows for sectors preset', async () => {
    mockFetchHistoricalData.mockResolvedValue(makeHistoricalData([100, 101, 102]))
    mockFetchQuote.mockResolvedValue({
      symbol: 'XLK',
      regularMarketPrice: 102,
      previousClose: 101,
    })

    const result = await handler(makeEvent({ preset: 'sectors' }))

    expect(result.rows).toBeDefined()
    expect(result.rows.length).toBe(15)
    expect(result.rows[0].symbol).toBe('XLK')
  })

  it('returns rows for indexes preset', async () => {
    mockFetchHistoricalData.mockResolvedValue(makeHistoricalData([400, 401]))
    mockFetchQuote.mockResolvedValue({
      symbol: 'SPY',
      regularMarketPrice: 401,
      previousClose: 400,
    })

    const result = await handler(makeEvent({ preset: 'indexes' }))

    expect(result.rows.length).toBe(8)
  })

  it('returns rows for custom preset with symbols', async () => {
    mockFetchHistoricalData.mockResolvedValue(makeHistoricalData([50, 51]))
    mockFetchQuote.mockResolvedValue({
      symbol: 'SMH',
      regularMarketPrice: 51,
      previousClose: 50,
    })

    const result = await handler(makeEvent({ preset: 'custom', symbols: 'SMH,SOXX' }))

    expect(result.rows.length).toBe(2)
    expect(result.rows[0].symbol).toBe('SMH')
    expect(result.rows[1].symbol).toBe('SOXX')
  })

  it('returns empty rows for custom preset without symbols', async () => {
    const result = await handler(makeEvent({ preset: 'custom' }))

    expect(result.rows).toEqual([])
  })

  it('rejects invalid preset', async () => {
    await expect(handler(makeEvent({ preset: 'invalid' }))).rejects.toThrow()
  })

  it('handles individual ETF failure with fallback row', async () => {
    let callCount = 0
    mockFetchHistoricalData.mockImplementation(() => {
      callCount += 1
      if (callCount === 1) throw new Error('Yahoo down')
      return Promise.resolve(makeHistoricalData([100, 101]))
    })
    mockFetchQuote.mockResolvedValue({
      symbol: 'SPY',
      regularMarketPrice: 101,
      previousClose: 100,
    })

    const result = await handler(makeEvent({ preset: 'custom', symbols: 'FAIL,OK' }))

    expect(result.rows.length).toBe(2)
    expect(result.rows[0].error).toBeDefined()
    expect(result.rows[0].symbol).toBe('FAIL')
    expect(result.rows[1].error).toBeUndefined()
  })

  it('fills failed rows from stale board cache', async () => {
    mockFetchHistoricalData.mockImplementation(() => { throw new Error('Yahoo down') })
    mockFetchQuote.mockResolvedValue(null)

    // Stale board cache has good data for XLK
    mockGetStaleCached.mockReturnValue([
      { symbol: 'XLK', sector: 'Tech', error: undefined, last: 200 },
    ])

    const result = await handler(makeEvent({ preset: 'sectors' }))

    // XLK should be filled from stale cache, not an error row
    const xlkRow = result.rows.find((r: any) => r.symbol === 'XLK')
    expect(xlkRow).toBeDefined()
    expect(xlkRow.error).toBeUndefined()
    expect(xlkRow.last).toBe(200)
  })

  it('throws rate limited error when rate limiter rejects', async () => {
    mockRateLimiterFn.mockRejectedValue(new Error('Rate limited'))

    await expect(handler(makeEvent({ preset: 'sectors' }))).rejects.toThrow()
  })

  it('caches board results for sectors preset', async () => {
    mockFetchHistoricalData.mockResolvedValue(makeHistoricalData([100]))
    mockFetchQuote.mockResolvedValue({
      symbol: 'XLK',
      regularMarketPrice: 100,
      previousClose: 99,
    })

    // First call: cache miss
    mockGetCached.mockReturnValue(null)

    await handler(makeEvent({ preset: 'sectors' }))

    expect(mockSetCached).toHaveBeenCalledWith(
      'board:sectors',
      expect.any(Array),
      expect.any(Number),
    )
  })

  it('returns cached board results without fetching Yahoo', async () => {
    const cachedRows = [{ symbol: 'XLK', sector: 'Tech', error: undefined }]
    mockGetCached.mockReturnValue(cachedRows)

    const result = await handler(makeEvent({ preset: 'sectors' }))

    expect(result.rows).toEqual(cachedRows)
    expect(mockFetchHistoricalData).not.toHaveBeenCalled()
  })

  it('bypasses board cache when nocache=1', async () => {
    mockFetchHistoricalData.mockResolvedValue(makeHistoricalData([100]))
    mockFetchQuote.mockResolvedValue({
      symbol: 'XLK',
      regularMarketPrice: 100,
      previousClose: 99,
    })

    await handler(makeEvent({ preset: 'sectors', nocache: '1' }))

    // Should not check or set board cache when nocache=1
    expect(mockGetCached).not.toHaveBeenCalled()
    expect(mockSetCached).not.toHaveBeenCalled()
    expect(mockFetchHistoricalData).toHaveBeenCalled()
  })

  it('does not use board cache for custom preset', async () => {
    mockFetchHistoricalData.mockResolvedValue(makeHistoricalData([100]))
    mockFetchQuote.mockResolvedValue({
      symbol: 'SMH',
      regularMarketPrice: 100,
      previousClose: 99,
    })

    await handler(makeEvent({ preset: 'custom', symbols: 'SMH' }))

    expect(mockGetCached).not.toHaveBeenCalled()
    expect(mockSetCached).not.toHaveBeenCalled()
  })

  it('limits custom symbols to 20', async () => {
    const manySymbols = Array.from({ length: 30 }, (_, i) => `SYM${i}`).join(',')
    mockFetchHistoricalData.mockResolvedValue(makeHistoricalData([100]))
    mockFetchQuote.mockResolvedValue({
      symbol: 'SYM0',
      regularMarketPrice: 100,
      previousClose: 99,
    })

    const result = await handler(makeEvent({ preset: 'custom', symbols: manySymbols }))

    expect(result.rows.length).toBe(20)
  })
})
