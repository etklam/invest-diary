import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCache } from '~/lib/market-data/cache'
import type { QuoteResponse } from '~/lib/yahoo-finance'

const mockDiaryFindMany = vi.fn()
const mockReadPortfolioTransactions = vi.fn()
const mockListCurrentThesisProjections = vi.fn()
const mockFetchQuote = vi.fn()
const mockCalculateHoldings = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: { findMany: mockDiaryFindMany },
  },
}))

vi.mock('~/server/utils/transaction-read', () => ({
  readPortfolioTransactions: mockReadPortfolioTransactions,
}))

vi.mock('~/server/utils/investment-thesis-queries', () => ({
  listCurrentThesisProjections: mockListCurrentThesisProjections,
}))

vi.mock('~/lib/yahoo-finance', () => ({
  fetchQuote: mockFetchQuote,
}))

vi.mock('~/lib/position-state', () => ({
  calculateHoldings: mockCalculateHoldings,
}))

// Holdings: AAPL 2×150 = 300 market value / 200 cost, MSFT 1×100 = 100 market
// value / 80 cost. calculateHoldings output is mocked symbol-normalized.
const HOLDINGS = [
  { symbol: 'AAPL', quantity: 2, avgCost: 100, totalCost: 200 },
  { symbol: 'MSFT', quantity: 1, avgCost: 80, totalCost: 80 },
]

const quote = (symbol: string, price: number): QuoteResponse => ({
  symbol,
  regularMarketPrice: price,
  previousClose: price,
  change: 0,
  changePercent: 0,
  currency: 'USD',
  marketState: 'REGULAR',
  lastUpdateTime: '2026-08-10T12:00:00.000Z',
})

const runHandler = async () => {
  const { default: handler } = await import('~/server/api/portfolio/attention.get')
  return handler({ context: { user: { id: '7' } }, requestId: 'attention-test' } as any)
}

describe('GET /api/portfolio/attention', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCache()
    mockDiaryFindMany.mockResolvedValue([])
    mockListCurrentThesisProjections.mockResolvedValue([])
    mockReadPortfolioTransactions.mockResolvedValue([])
    mockCalculateHoldings.mockReturnValue(HOLDINGS)
  })

  it('computes market-value concentration over priced holdings when one quote fails (no all-or-nothing nulls)', async () => {
    mockFetchQuote.mockImplementation(async (symbol: string) => {
      if (symbol === 'MSFT') throw new Error('provider down')
      return quote('AAPL', 150)
    })

    const result = await runHandler()

    const concentrationItems = result.items.filter(item => item.reason === 'position_concentration')
    expect(concentrationItems).toHaveLength(1)
    expect(concentrationItems[0]).toMatchObject({ symbol: 'AAPL' })
    expect(concentrationItems[0].evidence.concentrationPct).toBe(100) // only priced holding in denominator

    expect(result.coverage).toEqual({
      valuationStatus: 'partial',
      complete: false,
      priced: 1,
      total: 2,
    })
  })

  it('spreads concentration across all holdings under complete coverage', async () => {
    mockFetchQuote.mockImplementation(async (symbol: string) =>
      symbol === 'AAPL' ? quote('AAPL', 150) : quote('MSFT', 100),
    )

    const result = await runHandler()

    const bySymbol = new Map(
      result.items
        .filter(item => item.reason === 'position_concentration')
        .map(item => [item.symbol, item.evidence.concentrationPct]),
    )
    expect(bySymbol.get('AAPL')).toBeCloseTo(75, 10)
    expect(bySymbol.get('MSFT')).toBeCloseTo(25, 10)

    expect(result.coverage).toEqual({
      valuationStatus: 'complete',
      complete: true,
      priced: 2,
      total: 2,
    })
  })

  it('reports valuation unavailable and emits no concentration cards when every quote fails', async () => {
    mockFetchQuote.mockRejectedValue(new Error('provider down'))

    const result = await runHandler()

    expect(result.items.filter(item => item.reason === 'position_concentration')).toHaveLength(0)
    expect(result.coverage).toEqual({
      valuationStatus: 'unavailable',
      complete: false,
      priced: 0,
      total: 2,
    })
  })
})
