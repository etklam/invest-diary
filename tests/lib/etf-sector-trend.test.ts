import { describe, expect, it } from 'vitest'
import {
  buildSectorTrendRow,
  buildSparklinePoints,
  calculateEma,
  calculateRsi,
  calculateSma,
  getMovingAverageStatus,
} from '~/lib/etf-sector-trend'

function day(year: number, month: number, date: number) {
  return Math.floor(Date.UTC(year, month, date) / 1000)
}

describe('ETF sector trend calculations', () => {
  it('returns null when there is not enough data for indicators', () => {
    expect(calculateSma([1, 2], 3)).toBeNull()
    expect(calculateEma([1, 2], 3)).toBeNull()
    expect(calculateRsi([1, 2, 3], 14)).toBeNull()
  })

  it('calculates SMA, EMA, and RSI edge cases', () => {
    expect(calculateSma([1, 2, 3, 4], 3)).toBe(3)
    expect(calculateEma([1, 2, 3, 4], 3)).toBe(3)
    expect(calculateRsi(Array.from({ length: 15 }, (_, index) => index + 1), 14)).toBe(100)
    expect(calculateRsi(Array.from({ length: 15 }, (_, index) => 15 - index), 14)).toBe(0)
  })

  it('maps price position to moving-average status', () => {
    expect(getMovingAverageStatus(101, 100)).toBe('ABOVE')
    expect(getMovingAverageStatus(99, 100)).toBe('BELOW')
    expect(getMovingAverageStatus(null, 100)).toBeNull()
    expect(getMovingAverageStatus(100, null)).toBeNull()
  })

  it('builds a complete sector trend row from history and quote data', () => {
    const history = Array.from({ length: 60 }, (_, index) => ({
      timestamp: day(2026, 0, index + 1),
      close: 100 + index,
    }))

    const row = buildSectorTrendRow(
      { symbol: 'XLK', sector: 'Tech' },
      history,
      { regularMarketPrice: 160, previousClose: 158 },
      new Date('2026-03-01T00:00:00Z'),
    )

    expect(row.symbol).toBe('XLK')
    expect(row.closeCount).toBe(60)
    expect(row.recentCloses).toHaveLength(30)
    expect(row.dailyChange).toBeCloseTo(1.2658, 4)
    expect(row.weeklyChange).toBeCloseTo(3.8961, 4)
    expect(row.ema10Status).toBe('ABOVE')
    expect(row.ema20Status).toBe('ABOVE')
    expect(row.sma50Status).toBe('ABOVE')
    expect(row.ytdHighDistance).toBeCloseTo(0.6289, 4)
  })

  it('builds SVG sparkline points with stable bounds', () => {
    expect(buildSparklinePoints([1])).toBe('')
    expect(buildSparklinePoints([1, 2, 3], 100, 50, 5)).toBe('5.0,45.0 50.0,25.0 95.0,5.0')
  })
})
