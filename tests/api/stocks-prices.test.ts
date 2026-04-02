import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'
import type { QuoteResponse } from '~/lib/yahoo-finance'

const mockRequireUser = vi.fn()
const mockGeneralApi = vi.fn()
const mockGetRequestIP = vi.fn()
const mockFetchQuote = vi.fn()

vi.stubGlobal('getRequestIP', mockGetRequestIP)

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    generalApi: mockGeneralApi,
  },
}))

vi.mock('~/lib/yahoo-finance', () => ({
  fetchQuote: mockFetchQuote,
}))

describe('POST /api/stocks/prices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1', email: 'user@test.com', role: 'USER' })
    mockGetRequestIP.mockReturnValue('127.0.0.1')
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

  it('applies rate limiting before fan-out requests', async () => {
    mockReadBody.mockResolvedValue({ symbols: ['AAPL'] })
    mockGeneralApi.mockRejectedValueOnce(new Error('limited'))

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    await expect(handler({ context: { user: { id: '1' } } } as any)).rejects.toMatchObject({
      statusCode: 429,
    })
    expect(mockFetchQuote).not.toHaveBeenCalled()
  })

  it('returns quote responses for symbols', async () => {
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

    mockReadBody.mockResolvedValue({ symbols: ['2330.TW', 'AAPL'] })
    mockGeneralApi.mockResolvedValueOnce(true)
    mockFetchQuote
      .mockResolvedValueOnce(mockQuote2330)
      .mockResolvedValueOnce(mockQuoteAAPL)

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    const result = await handler({ context: { user: { id: '1' } } } as any)

    expect(result).toEqual({
      '2330.TW': mockQuote2330,
      AAPL: mockQuoteAAPL,
    })
    expect(mockGeneralApi).toHaveBeenCalledWith('127.0.0.1')
  })

  it('handles partial failures gracefully', async () => {
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

    mockReadBody.mockResolvedValue({ symbols: ['INVALID', 'AAPL'] })
    mockGeneralApi.mockResolvedValueOnce(true)
    mockFetchQuote
      .mockRejectedValueOnce(new Error('Symbol not found'))
      .mockResolvedValueOnce(mockQuoteAAPL)

    const { default: handler } = await import('~/server/api/stocks/prices.post')

    const result = await handler({ context: { user: { id: '1' } } } as any)

    // Should return only the successful quote
    expect(result).toEqual({ AAPL: mockQuoteAAPL })
    expect(mockGeneralApi).toHaveBeenCalledWith('127.0.0.1')
  })
})
