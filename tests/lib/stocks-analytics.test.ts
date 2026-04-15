import { describe, expect, it } from 'vitest'
import { buildHoldingChartSegments, formatHoldingQuantity, formatHoldingShare, getHoldingConcentrationClass } from '~/lib/stocks-analytics'

describe('stocks analytics helpers', () => {
  it('formats quantities and concentration percentages for display', () => {
    expect(formatHoldingQuantity(12.3400)).toBe('12.34')
    expect(formatHoldingQuantity(3)).toBe('3')
    expect(formatHoldingShare(200, 350)).toBe('57.1%')
    expect(formatHoldingShare(0, 0)).toBe('0%')
  })

  it('returns stable badge classes by concentration threshold', () => {
    expect(getHoldingConcentrationClass(25)).toContain('text-red-800')
    expect(getHoldingConcentrationClass(12)).toContain('text-yellow-800')
    expect(getHoldingConcentrationClass(5)).toContain('text-green-800')
  })

  it('builds cumulative chart segments for holdings', () => {
    const segments = buildHoldingChartSegments([
      { symbol: 'AAPL', totalCost: 200 },
      { symbol: 'TSLA', totalCost: 100 },
      { symbol: 'MSFT', totalCost: 50 },
    ], {
      radius: 32.5,
      strokeWidth: 15,
    })

    expect(segments).toHaveLength(3)
    expect(segments[0]).toMatchObject({
      label: 'AAPL',
      percentage: '57.1%',
      radius: 32.5,
      strokeWidth: 15,
      color: '#b85c38',
    })
    expect(segments[1]?.dashOffset).toBeLessThan(0)
  })
})
