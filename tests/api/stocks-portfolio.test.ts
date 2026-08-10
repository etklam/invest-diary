import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockReadPortfolioTransactions = vi.fn()
const mockCalculateHoldings = vi.fn()
const mockFetchQuote = vi.fn()

vi.mock('~/server/utils/transaction-read', () => ({
  readPortfolioTransactions: mockReadPortfolioTransactions,
}))

vi.mock('~/lib/position-state', () => ({
  calculateHoldings: mockCalculateHoldings,
}))

vi.mock('~/lib/yahoo-finance', () => ({
  fetchQuote: mockFetchQuote,
}))

vi.mock('~/lib/market-data/cache', () => ({
  buildMarketQuoteCacheKey: (symbol: string) => `quote:${symbol}`,
  getMarketDataCacheTtlSeconds: () => 60,
  getOrSetCached: (_key: string, _ttl: number, loader: () => unknown) => loader(),
}))

describe('GET /api/stocks/portfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadPortfolioTransactions.mockResolvedValue([])
    mockCalculateHoldings.mockReturnValue([
      { symbol: 'AAPL', quantity: 2, avgCost: 100, totalCost: 200 },
      { symbol: 'MSFT', quantity: 1, avgCost: 80, totalCost: 80 },
    ])
  })

  it('returns a complete owner-scoped valuation with quote as-of metadata', async () => {
    mockFetchQuote.mockImplementation(async (symbol: string) => ({
      symbol,
      regularMarketPrice: symbol === 'AAPL' ? 120 : 90,
      previousClose: 80,
      change: 1,
      changePercent: 1,
      currency: 'USD',
      marketState: 'REGULAR',
      lastUpdateTime: '2026-08-10T12:00:00.000Z',
    }))

    const { default: handler } = await import('~/server/api/stocks/portfolio.get')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'portfolio-complete' } } as any)

    expect(mockReadPortfolioTransactions).toHaveBeenCalledWith(7n)
    expect(result?.valuation).toMatchObject({
      valuationStatus: 'complete',
      currentMarketValue: 330,
      pricedPositionCount: 2,
      unpricedPositionCount: 0,
      valuationAsOf: '2026-08-10T12:00:00.000Z',
    })
    expect(result?.quoteErrors).toEqual([])
  })

  it('keeps holdings and separates unpriced cost when one quote fails', async () => {
    mockFetchQuote.mockImplementation(async (symbol: string) => symbol === 'AAPL'
      ? {
          symbol,
          regularMarketPrice: 120,
          previousClose: 119,
          change: 1,
          changePercent: 1,
          currency: 'USD',
          marketState: 'REGULAR',
          lastUpdateTime: '2026-08-10T12:00:00.000Z',
        }
      : null)

    const { default: handler } = await import('~/server/api/stocks/portfolio.get')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'portfolio-partial' } } as any)

    expect(result?.holdings).toHaveLength(2)
    expect(result?.valuation).toMatchObject({
      valuationStatus: 'partial',
      currentMarketValue: 240,
      pricedPositionCount: 1,
      unpricedPositionCount: 1,
      unpricedCostBasis: 80,
    })
    expect(result?.quoteErrors).toEqual(['MSFT'])
  })

  it('reports valuation unavailable without making persisted holdings look empty', async () => {
    mockFetchQuote.mockRejectedValue(new Error('provider down'))

    const { default: handler } = await import('~/server/api/stocks/portfolio.get')
    const result = await handler({ context: { user: { id: '7' }, requestId: 'portfolio-unavailable' } } as any)

    expect(result?.holdings).toHaveLength(2)
    expect(result?.valuation.currentMarketValue).toBeNull()
    expect(result?.valuation.valuationStatus).toBe('unavailable')
    expect(result?.valuation.totalCost).toBe(280)
    expect(result?.quoteErrors).toEqual(expect.arrayContaining(['AAPL', 'MSFT']))
  })
})
