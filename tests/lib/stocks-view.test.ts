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
    expect(result.currentMarketValue).toBe(300)
    expect(result.pricedPositionCount).toBe(2)
    expect(result.unpricedPositionCount).toBe(1)
    expect(result.unpricedCostBasis).toBe(50)
    expect(result.valuationStatus).toBe('partial')
  })

  it('calculates unrealized P/L', () => {
    const result = computePortfolioAggregations(holdings)

    expect(result.unrealizedAmount).toBe(0) // priced value 300 - priced cost 300
    expect(result.unrealizedPct).toBe(0)
  })

  it('calculates concentration only across the disclosed priced subset', () => {
    const result = computePortfolioAggregations(holdings)

    expect(result.activePositionCount).toBe(3)
    expect(result.largestPositionSymbol).toBe('AAPL')
    expect(result.largestPositionPct).toBe(50)
    expect(result.top3ConcentrationPct).toBe(100)
    expect(result.concentrationWarning).toBe(true)
  })

  it('uses market value when live prices are available for concentration', () => {
    const result = computePortfolioAggregations(holdingsWithDayChange)

    expect(result.currentMarketValue).toBe(2410)
    expect(result.largestPositionSymbol).toBe('AAPL')
    expect(result.largestPositionPct).toBeCloseTo(62.24, 2)
    expect(result.top3ConcentrationPct).toBe(100)
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
    expect(result.currentMarketValue).toBeNull()
    expect(result.unrealizedAmount).toBeNull()
    expect(result.unrealizedPct).toBeNull()
    expect(result.totalDayChange).toBeNull()
    expect(result.totalDayChangePercent).toBeNull()
    expect(result.valuationStatus).toBe('empty')
  })

  it('handles holdings without day change data', () => {
    const result = computePortfolioAggregations(holdings)

    expect(result.totalDayChange).toBeNull()
    expect(result.totalDayChangePercent).toBeNull()
  })

  it('reports unavailable rather than substituting cost when no position has a quote', () => {
    const result = computePortfolioAggregations([
      { symbol: 'MSFT', quantity: 2, avgCost: 50, totalCost: 100 },
    ])

    expect(result.currentMarketValue).toBeNull()
    expect(result.unpricedCostBasis).toBe(100)
    expect(result.quoteCoveragePct).toBe(0)
    expect(result.valuationStatus).toBe('unavailable')
  })

  it('uses the oldest included quote time as valuation as-of and reports stale quotes', () => {
    const result = computePortfolioAggregations([
      { symbol: 'AAPL', quantity: 1, avgCost: 100, totalCost: 100, price: 120, quoteAsOf: '2026-08-01T00:00:00.000Z' },
      { symbol: 'NVDA', quantity: 1, avgCost: 80, totalCost: 80, price: 90, quoteAsOf: '2026-08-10T00:00:00.000Z' },
    ], { now: new Date('2026-08-10T12:00:00.000Z') })

    expect(result.valuationAsOf).toBe('2026-08-01T00:00:00.000Z')
    expect(result.staleQuoteCount).toBe(1)
    expect(result.valuationStatus).toBe('complete')
    expect(result.unsupportedMetrics).toEqual(['ytdReturn', 'realCashPercentage', 'sectorConcentration'])
  })
})
