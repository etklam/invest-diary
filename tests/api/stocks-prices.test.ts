import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'
import { clearCache } from '~/lib/market-data/cache'
import type { QuoteResponse } from '~/lib/yahoo-finance'

const mockRequireUser = vi.fn()
const mockGeneralApi = vi.fn()
const mockGetRateLimitIdentifier = vi.fn()
const mockFetchQuote = vi.fn()

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    generalApi: mockGeneralApi,
  },
  getRateLimitIdentifier: mockGetRateLimitIdentifier,
}))

vi.mock('~/lib/yahoo-finance', () => ({
  fetchQuote: mockFetchQuote,
}))

const mockQuoteAAPL: QuoteResponse = {
  symbol: 'AAPL',
  regularMarketPrice: 234.56,
  previousClose: 230,
  change: 4.56,
  changePercent: 1.98,
  currency: 'USD',
  marketState: 'REGULAR',
  lastUpdateTime: '2025-04-03T00:00:00.000Z',
}

const mockQuote2330: QuoteResponse = {
  symbol: '2330.TW',
  regularMarketPrice: 123.45,
  previousClose: 120,
  change: 3.45,
  changePercent: 2.88,
  currency: 'TWD',
  marketState: 'REGULAR',
  lastUpdateTime: '2025-04-03T00:00:00.000Z',
}

describe('POST /api/stocks/prices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCache()
    mockRequireUser.mockReturnValue({ id: '1', email: 'user@test.com', role: 'USER' })
    mockGetRateLimitIdentifier.mockReturnValue('127.0.0.1')
    mockGeneralApi.mockResolvedValue(true)
  })

  it('requires authentication', async () => {
    mockRequireUser.mockImplementation(() => {
      throw Object.assign(new Error('UNAUTHORIZED'), {
        statusCode: 401,
        statusMessage: 'UNAUTHORIZED',
      })
    })
    mockReadBody.mockResolvedValue({ symbols: ['AAPL'] })

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 401,
    })
  })

  it('rejects requests with too many symbols', async () => {
    mockReadBody.mockResolvedValue({
      symbols: Array.from({ length: 26 }, (_, index) => `SYM${index}`),
    })

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mockGeneralApi).not.toHaveBeenCalled()
  })

  it('rejects requests with empty symbols', async () => {
    mockReadBody.mockResolvedValue({ symbols: [] })

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mockFetchQuote).not.toHaveBeenCalled()
  })

  it('applies rate limiting before fan-out requests', async () => {
    mockReadBody.mockResolvedValue({ symbols: ['AAPL'] })
    mockGeneralApi.mockRejectedValueOnce(new Error('limited'))

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 429,
    })
    expect(mockFetchQuote).not.toHaveBeenCalled()
  })

  it('uses the shared rate-limit identifier helper for the client IP', async () => {
    mockGetRateLimitIdentifier.mockReturnValue('203.0.113.9')
    mockReadBody.mockResolvedValue({ symbols: ['AAPL'] })
    mockFetchQuote.mockResolvedValue(mockQuoteAAPL)

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    await handler({ context: { user: { id: '1' } } } as any)

    expect(mockGetRateLimitIdentifier).toHaveBeenCalled()
    expect(mockGeneralApi).toHaveBeenCalledWith('203.0.113.9')
  })

  it('returns quote responses for symbols', async () => {
    mockReadBody.mockResolvedValue({ symbols: ['2330.TW', 'AAPL'] })
    mockFetchQuote.mockImplementation((symbol: string) => {
      if (symbol === '2330.TW') return Promise.resolve(mockQuote2330)
      if (symbol === 'AAPL') return Promise.resolve(mockQuoteAAPL)
      return Promise.reject(new Error('unknown symbol'))
    })

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    const result = await handler({ context: { user: { id: '1' } } } as any)

    expect(result).toEqual({
      '2330.TW': mockQuote2330,
      AAPL: mockQuoteAAPL,
    })
    expect(mockGeneralApi).toHaveBeenCalledWith('127.0.0.1')
  })

  it('handles partial failures gracefully', async () => {
    mockReadBody.mockResolvedValue({ symbols: ['INVALID', 'AAPL'] })
    mockFetchQuote.mockImplementation((symbol: string) => {
      if (symbol === 'INVALID') return Promise.reject(new Error('Symbol not found'))
      if (symbol === 'AAPL') return Promise.resolve(mockQuoteAAPL)
      return Promise.reject(new Error('unknown symbol'))
    })

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    const result = await handler({ context: { user: { id: '1' } } } as any)

    // Should return only the successful quote
    expect(result).toEqual({ AAPL: mockQuoteAAPL })
    expect(mockGeneralApi).toHaveBeenCalledWith('127.0.0.1')
  })

  it('deduplicates duplicate symbols before fetching', async () => {
    mockReadBody.mockResolvedValue({ symbols: ['AAPL', 'AAPL', 'aapl'] })
    mockFetchQuote.mockResolvedValue(mockQuoteAAPL)

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    const result = await handler({ context: { user: { id: '1' } } } as any)

    // 'AAPL' and 'aapl' share a cache key (normalized uppercase); only one upstream fetch
    expect(mockFetchQuote).toHaveBeenCalledTimes(1)
    expect(result.AAPL).toEqual(mockQuoteAAPL)
  })

  it('serves repeated requests from cache without re-fetching Yahoo', async () => {
    mockReadBody.mockResolvedValue({ symbols: ['AAPL', '2330.TW'] })
    mockFetchQuote.mockImplementation((symbol: string) => {
      if (symbol === 'AAPL') return Promise.resolve(mockQuoteAAPL)
      if (symbol === '2330.TW') return Promise.resolve(mockQuote2330)
      return Promise.reject(new Error('unknown symbol'))
    })

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    const first = await handler({ context: { user: { id: '1' } } } as any)
    expect(mockFetchQuote).toHaveBeenCalledTimes(2)

    const second = await handler({ context: { user: { id: '1' } } } as any)

    // second call should be fully cached — no additional Yahoo fetches
    expect(mockFetchQuote).toHaveBeenCalledTimes(2)
    expect(second).toEqual(first)
  })
})
