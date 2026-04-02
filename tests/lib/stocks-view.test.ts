import { describe, expect, it } from 'vitest'
import { applyStocksView, computePortfolioAggregations, type HoldingViewInput } from '~/lib/stocks-view'

const holdings: HoldingViewInput[] = [
  { symbol: 'AAPL', quantity: 1, avgCost: 100, totalCost: 100, price: 150 },
  { symbol: 'TSLA', quantity: 1, avgCost: 200, totalCost: 200, price: 150 },
  { symbol: 'MSFT', quantity: 1, avgCost: 50, totalCost: 50 }
]

const holdingsWithDayChange: HoldingViewInput[] = [
  { symbol: 'AAPL', quantity: 10, avgCost: 100, totalCost: 1000, price: 150, dayChange: 2.5, dayChangePercent: 1.67 },
  { symbol: 'TSLA', quantity: 5, avgCost: 200, totalCost: 1000, price: 150, dayChange: -3.0, dayChangePercent: -2.0 },
  { symbol: 'MSFT', quantity: 2, avgCost: 50, totalCost: 100, price: 80, dayChange: 1.0, dayChangePercent: 1.25 }
]

describe('applyStocksView', () => {
  it('filters by symbol search case-insensitively', () => {
    const result = applyStocksView(holdings, {
      search: 'aaP',
      profitStatus: 'all',
      concentration: 'all',
      sortKey: 'totalCost',
      sortDir: 'desc'
    })

    expect(result).toHaveLength(1)
    expect(result[0]?.symbol).toBe('AAPL')
  })

  it('filters by profit status', () => {
    const gain = applyStocksView(holdings, {
      search: '',
      profitStatus: 'gain',
      concentration: 'all',
      sortKey: 'totalCost',
      sortDir: 'desc'
    })
    const loss = applyStocksView(holdings, {
      search: '',
      profitStatus: 'loss',
      concentration: 'all',
      sortKey: 'totalCost',
      sortDir: 'desc'
    })
    const noQuote = applyStocksView(holdings, {
      search: '',
      profitStatus: 'no-quote',
      concentration: 'all',
      sortKey: 'totalCost',
      sortDir: 'desc'
    })

    expect(gain.map(h => h.symbol)).toEqual(['AAPL'])
    expect(loss.map(h => h.symbol)).toEqual(['TSLA'])
    expect(noQuote.map(h => h.symbol)).toEqual(['MSFT'])
  })

  it('filters by concentration threshold', () => {
    const result = applyStocksView(holdings, {
      search: '',
      profitStatus: 'all',
      concentration: 'ge20',
      sortKey: 'totalCost',
      sortDir: 'desc'
    })

    expect(result.map(h => h.symbol)).toEqual(['TSLA', 'AAPL'])
  })

  it('sorts by market value and keeps no-quote at end', () => {
    const result = applyStocksView(holdings, {
      search: '',
      profitStatus: 'all',
      concentration: 'all',
      sortKey: 'marketValue',
      sortDir: 'desc'
    })

    expect(result.map(h => h.symbol)).toEqual(['AAPL', 'TSLA', 'MSFT'])
  })

  it('sorts by unrealized percentage asc', () => {
    const result = applyStocksView(holdings, {
      search: '',
      profitStatus: 'all',
      concentration: 'all',
      sortKey: 'unrealizedPct',
      sortDir: 'asc'
    })

    expect(result.map(h => h.symbol)).toEqual(['TSLA', 'AAPL', 'MSFT'])
  })

  it('calculates day change amount for each holding', () => {
    const result = applyStocksView(holdingsWithDayChange, {
      search: '',
      profitStatus: 'all',
      concentration: 'all',
      sortKey: 'totalCost',
      sortDir: 'desc'
    })

    // AAPL: 2.5 * 10 = 25
    expect(result[0]?.dayChangeAmount).toBe(25)
    // TSLA: -3.0 * 5 = -15
    expect(result[1]?.dayChangeAmount).toBe(-15)
    // MSFT: 1.0 * 2 = 2
    expect(result[2]?.dayChangeAmount).toBe(2)
  })

  it('returns null for day change amount when day change is undefined', () => {
    const result = applyStocksView(holdings, {
      search: '',
      profitStatus: 'all',
      concentration: 'all',
      sortKey: 'totalCost',
      sortDir: 'desc'
    })

    expect(result[0]?.dayChangeAmount).toBeNull()
  })
})

describe('computePortfolioAggregations', () => {
  it('calculates basic portfolio stats', () => {
    const result = computePortfolioAggregations(holdings)

    expect(result.totalHoldings).toBe(3)
    expect(result.totalCost).toBe(350) // 100 + 200 + 50
    expect(result.currentMarketValue).toBe(350) // 150 + 150 + 50 (MSFT falls back to cost)
  })

  it('calculates unrealized P/L', () => {
    const result = computePortfolioAggregations(holdings)

    expect(result.unrealizedAmount).toBe(0) // 350 - 350 (MSFT has no price, falls back to cost)
    expect(result.unrealizedPct).toBe(0)
  })

  it('calculates day change aggregations', () => {
    const result = computePortfolioAggregations(holdingsWithDayChange)

    // Total day change: 25 + (-15) + 2 = 12
    expect(result.totalDayChange).toBe(12)

    // Previous market value: (1500 + 750 + 160) - 12 = 2398
    // Day change percent: 12 / 2398 * 100 ≈ 0.5
    expect(result.totalDayChangePercent).toBeCloseTo(0.5, 1)
  })

  it('handles empty holdings array', () => {
    const result = computePortfolioAggregations([])

    expect(result.totalHoldings).toBe(0)
    expect(result.totalCost).toBe(0)
    expect(result.currentMarketValue).toBe(0)
    expect(result.unrealizedAmount).toBe(0)
    expect(result.unrealizedPct).toBe(0)
    expect(result.totalDayChange).toBe(0)
    expect(result.totalDayChangePercent).toBe(0)
  })

  it('handles holdings without day change data', () => {
    const result = computePortfolioAggregations(holdings)

    expect(result.totalDayChange).toBe(0)
    expect(result.totalDayChangePercent).toBe(0)
  })
})
