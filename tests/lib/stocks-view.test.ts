import { describe, expect, it } from 'vitest'
import { applyStocksView, type HoldingViewInput } from '~/lib/stocks-view'

const holdings: HoldingViewInput[] = [
  { symbol: 'AAPL', quantity: 1, avgCost: 100, totalCost: 100, price: 150 },
  { symbol: 'TSLA', quantity: 1, avgCost: 200, totalCost: 200, price: 150 },
  { symbol: 'MSFT', quantity: 1, avgCost: 50, totalCost: 50 }
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
})
