import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRequireUser = vi.fn()
const mockYahooFinanceLimiter = vi.fn()
const mockGetRequestIP = vi.fn()
const mockFetchQuote = vi.fn()
const mockFetchIntradayData = vi.fn()

vi.stubGlobal('getRequestIP', mockGetRequestIP)

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    yahooFinance: mockYahooFinanceLimiter,
  },
}))

vi.mock('~/lib/yahoo-finance', () => ({
  fetchQuote: mockFetchQuote,
  fetchIntradayData: mockFetchIntradayData,
}))

describe('GET /api/market/spx-session', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1' })
    mockGetRequestIP.mockReturnValue('127.0.0.1')
    mockYahooFinanceLimiter.mockResolvedValue(undefined)
    mockFetchQuote.mockResolvedValue({
      symbol: '^GSPC',
      regularMarketPrice: 5010,
      previousClose: 5000,
      change: 10,
      changePercent: 0.2,
      currency: 'USD',
      marketState: 'REGULAR',
      lastUpdateTime: '2026-04-24T20:00:00.000Z',
    })
    mockFetchIntradayData.mockResolvedValue([
      { timestamp: 1777075800, open: 4980, high: 5015, low: 4975, close: 5010, volume: null },
    ])
  })

  it('requires auth, rate limits, and returns the SPX session summary', async () => {
    const { default: handler } = await import('~/server/api/market/spx-session.get')

    const result = await handler({ context: {} } as any)

    expect(mockRequireUser).toHaveBeenCalled()
    expect(mockYahooFinanceLimiter).toHaveBeenCalledWith('127.0.0.1')
    expect(mockFetchQuote).toHaveBeenCalledWith('SPX')
    expect(mockFetchIntradayData).toHaveBeenCalledWith('SPX', 3, '5m')
    expect(result).toMatchObject({
      symbol: 'SPX',
      sourceSymbol: '^GSPC',
      condition: 'gapDownRecovery',
      price: 5010,
    })
  })

  it('returns 429 when rate limited', async () => {
    mockYahooFinanceLimiter.mockRejectedValue(new Error('limited'))
    const { default: handler } = await import('~/server/api/market/spx-session.get')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 429,
    })
  })

  it('returns 502 when Yahoo data cannot be loaded', async () => {
    mockFetchQuote.mockRejectedValue(new Error('unavailable'))
    const { default: handler } = await import('~/server/api/market/spx-session.get')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 502,
    })
  })
})
