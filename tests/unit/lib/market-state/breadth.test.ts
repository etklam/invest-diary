import { describe, expect, it } from 'vitest'
import { calcAboveMaPct, calcRatioNDaily, countMove4Pct } from '~/lib/market-state/breadth'

describe('countMove4Pct', () => {
  it('正確計算單日上漲與下跌超過 4% 的數量', () => {
    const result = countMove4Pct([
      { close: 104, previousClose: 100 },
      { close: 103.99, previousClose: 100 },
      { close: 96, previousClose: 100 },
      { close: 96.01, previousClose: 100 },
      { close: 120, previousClose: 100 },
    ])

    expect(result).toEqual({ up4Count: 2, down4Count: 1 })
  })

  it('空陣列時返回 0', () => {
    expect(countMove4Pct([])).toEqual({ up4Count: 0, down4Count: 0 })
  })

  it('previousClose 小於等於 0 時略過，避免無效報酬率', () => {
    const result = countMove4Pct([
      { close: 100, previousClose: 0 },
      { close: 100, previousClose: -10 },
      { close: 105, previousClose: 100 },
    ])

    expect(result).toEqual({ up4Count: 1, down4Count: 0 })
  })
})

describe('calcAboveMaPct', () => {
  it('正確計算收盤價高於均線的百分比', () => {
    const result = calcAboveMaPct([
      { close: 101, sma: 100 },
      { close: 99, sma: 100 },
      { close: 110, sma: 100 },
    ], 4)

    expect(result).toBeCloseTo(50)
  })

  it('universeCount 為 0 時返回 0', () => {
    expect(calcAboveMaPct([{ close: 101, sma: 100 }], 0)).toBe(0)
  })

  it('空價格陣列時返回 0', () => {
    expect(calcAboveMaPct([], 10)).toBe(0)
  })
})

describe('calcRatioNDaily', () => {
  it('正確計算指定天數內 up4Count 總和除以 down4Count 總和', () => {
    const result = calcRatioNDaily([
      { up4Count: 3, down4Count: 1 },
      { up4Count: 4, down4Count: 2 },
      { up4Count: 9, down4Count: 9 },
    ], 2)

    expect(result).toBeCloseTo(13 / 11)
  })

  it('只使用最近 N 天資料', () => {
    const result = calcRatioNDaily([
      { up4Count: 100, down4Count: 1 },
      { up4Count: 2, down4Count: 1 },
      { up4Count: 4, down4Count: 1 },
    ], 2)

    expect(result).toBe(3)
  })

  it('down4Count 總和為 0 時用 1 保護除零', () => {
    const result = calcRatioNDaily([
      { up4Count: 2, down4Count: 0 },
      { up4Count: 3, down4Count: 0 },
    ], 10)

    expect(result).toBe(5)
  })

  it('空歷史或 days 小於等於 0 時返回 0', () => {
    expect(calcRatioNDaily([], 10)).toBe(0)
    expect(calcRatioNDaily([{ up4Count: 1, down4Count: 1 }], 0)).toBe(0)
  })

  it('全零歷史返回 0', () => {
    expect(calcRatioNDaily([
      { up4Count: 0, down4Count: 0 },
      { up4Count: 0, down4Count: 0 },
    ], 2)).toBe(0)
  })
})
