import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCache } from '~/lib/market-data/cache'
import { mockGetQuery, mockGetRouterParam } from '../../vi-setup'

const mockFetchQuote = vi.fn()
const mockYahooFinanceLimiter = vi.fn()
const mockGetRateLimitIdentifier = vi.fn()

vi.mock('~/lib/yahoo-finance', () => ({
  fetchQuote: mockFetchQuote,
}))

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    yahooFinance: mockYahooFinanceLimiter,
  },
  getRateLimitIdentifier: mockGetRateLimitIdentifier,
}))

describe('market quote api', () => {
  beforeEach(() => {
    clearCache()
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
    mockGetRouterParam.mockReturnValue('SPY')
    mockGetRateLimitIdentifier.mockReturnValue('127.0.0.1')
    mockYahooFinanceLimiter.mockResolvedValue(undefined)
    mockFetchQuote.mockResolvedValue({ symbol: 'SPY', regularMarketPrice: 600 })
  })

  it('returns quote for router symbol', async () => {
    const { default: handler } = await import('~/server/api/market/quote/[symbol].get')

    const result = await handler({ context: {} } as any)

    expect(mockYahooFinanceLimiter).toHaveBeenCalledWith('127.0.0.1')
    expect(mockFetchQuote).toHaveBeenCalledWith('SPY')
    expect(result).toEqual({ symbol: 'SPY', regularMarketPrice: 600 })
  })

  it('returns cached quote without fetching Yahoo again', async () => {
    const { default: handler } = await import('~/server/api/market/quote/[symbol].get')

    await handler({ context: {} } as any)
    const result = await handler({ context: {} } as any)

    expect(mockYahooFinanceLimiter).toHaveBeenCalledTimes(2)
    expect(mockFetchQuote).toHaveBeenCalledTimes(1)
    expect(result).toEqual({ symbol: 'SPY', regularMarketPrice: 600 })
  })

  it('bypasses cached quote when nocache is set', async () => {
    const { default: handler } = await import('~/server/api/market/quote/[symbol].get')

    await handler({ context: {} } as any)
    mockGetQuery.mockReturnValue({ nocache: '1' })
    mockFetchQuote.mockResolvedValue({ symbol: 'SPY', regularMarketPrice: 601 })

    const result = await handler({ context: {} } as any)

    expect(mockFetchQuote).toHaveBeenCalledTimes(2)
    expect(result).toEqual({ symbol: 'SPY', regularMarketPrice: 601 })
  })

  it('decodes encoded router symbols before fetching the quote', async () => {
    mockGetRouterParam.mockReturnValue('%5EGSPC')
    mockFetchQuote.mockResolvedValue({ symbol: '^GSPC', regularMarketPrice: 5100 })

    const { default: handler } = await import('~/server/api/market/quote/[symbol].get')

    const result = await handler({ context: {} } as any)

    expect(mockFetchQuote).toHaveBeenCalledWith('^GSPC')
    expect(result).toEqual({ symbol: '^GSPC', regularMarketPrice: 5100 })
  })

  it('returns 400 when symbol is missing', async () => {
    mockGetRouterParam.mockReturnValue(undefined)
    const { default: handler } = await import('~/server/api/market/quote/[symbol].get')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Validation failed',
    })
  })

  it('returns 429 when rate limit rejects', async () => {
    mockYahooFinanceLimiter.mockRejectedValue(new Error('limited'))
    const { default: handler } = await import('~/server/api/market/quote/[symbol].get')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 429,
      statusMessage: 'Too many requests. Please try again later.',
    })
  })

  it('returns 502 when upstream quote fetch fails', async () => {
    mockFetchQuote.mockRejectedValue(new Error('unavailable'))
    const { default: handler } = await import('~/server/api/market/quote/[symbol].get')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 502,
      statusMessage: 'Quote unavailable. Please try again later.',
    })
  })
})
