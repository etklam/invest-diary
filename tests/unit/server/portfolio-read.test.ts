import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  readTransactions: vi.fn(),
  calculateHoldings: vi.fn(),
  fetchQuotesBounded: vi.fn(),
}))

vi.mock('~/server/utils/transaction-read', () => ({
  readPortfolioTransactions: mocks.readTransactions,
}))
vi.mock('~/lib/position-state', async () => {
  const actual = await vi.importActual<typeof import('~/lib/position-state')>('~/lib/position-state')
  return { ...actual, calculateHoldings: mocks.calculateHoldings }
})
vi.mock('~/lib/market-data/quote', () => ({
  fetchQuotesBounded: mocks.fetchQuotesBounded,
}))

import { loadPortfolioHoldings, loadPortfolioSnapshot, loadValuedHoldings } from '~/server/utils/portfolio-read'

const holdings = [
  { symbol: 'AAPL', quantity: 2, avgCost: 100, totalCost: 200 },
  { symbol: 'MSFT', quantity: 1, avgCost: 80, totalCost: 80 },
]

function quote(symbol: string, price: number) {
  return {
    symbol,
    regularMarketPrice: price,
    previousClose: price - 1,
    change: 1,
    changePercent: 1,
    currency: 'USD',
    marketState: 'REGULAR',
    lastUpdateTime: '2026-08-10T12:00:00.000Z',
  }
}

describe('portfolio read module', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.readTransactions.mockResolvedValue([])
    mocks.calculateHoldings.mockReturnValue(holdings)
  })

  it('owns the unvalued transaction-to-holdings read', async () => {
    const result = await loadPortfolioHoldings(7n)

    expect(mocks.readTransactions).toHaveBeenCalledWith(7n)
    expect(mocks.calculateHoldings).toHaveBeenCalledWith([])
    expect(result).toEqual(holdings)
  })

  it('can expose the same unvalued read with transaction history for read models', async () => {
    const transaction = { id: '1', symbol: 'AAPL', type: 'BUY' as const, quantity: 2, price: 100, tradeDate: new Date('2026-08-01'), strategy: null, emotion: null }
    mocks.readTransactions.mockResolvedValue([transaction])

    const result = await loadPortfolioSnapshot(7n)

    expect(result.transactions).toEqual([transaction])
    expect(result.holdings).toEqual(holdings)
  })

  it('returns one enriched shape and complete valuation', async () => {
    mocks.fetchQuotesBounded.mockResolvedValue({
      quotes: new Map([
        ['AAPL', quote('AAPL', 120)],
        ['MSFT', quote('MSFT', 90)],
      ]),
      errors: [],
    })

    const result = await loadValuedHoldings(7n)

    expect(result.holdings).toEqual([
      expect.objectContaining({
        symbol: 'AAPL',
        price: 120,
        dayChange: 1,
        dayChangePercent: 1,
        quoteAsOf: '2026-08-10T12:00:00.000Z',
      }),
      expect.objectContaining({ symbol: 'MSFT', price: 90 }),
    ])
    expect(result.pricedHoldings).toHaveLength(2)
    expect(result.valuation.valuationStatus).toBe('complete')
    expect(result.quoteErrors).toEqual([])
    expect(result.marketState).toBe('REGULAR')
  })

  it('keeps unpriced holdings and marks partial valuation', async () => {
    mocks.fetchQuotesBounded.mockResolvedValue({
      quotes: new Map([['AAPL', quote('AAPL', 120)]]),
      errors: ['MSFT'],
    })

    const result = await loadValuedHoldings(7n)

    expect(result.holdings).toHaveLength(2)
    expect(result.pricedHoldings.map(holding => holding.symbol)).toEqual(['AAPL'])
    expect(result.valuation.valuationStatus).toBe('partial')
    expect(result.valuation.unpricedCostBasis).toBe(80)
    expect(result.quoteErrors).toEqual(['MSFT'])
  })

  it('marks valuation unavailable without dropping persisted holdings', async () => {
    mocks.fetchQuotesBounded.mockResolvedValue({ quotes: new Map(), errors: ['AAPL', 'MSFT'] })

    const result = await loadValuedHoldings(7n)

    expect(result.holdings).toHaveLength(2)
    expect(result.pricedHoldings).toEqual([])
    expect(result.valuation.valuationStatus).toBe('unavailable')
    expect(result.valuation.totalCost).toBe(280)
    expect(result.quoteErrors).toEqual(['AAPL', 'MSFT'])
  })
})
