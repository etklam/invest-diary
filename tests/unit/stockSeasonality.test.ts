import { describe, it, expect } from 'vitest'
import {
  calculatePeriodAvgReturn,
  getCurrentMonth,
  analyzeSeasonality,
} from '~/lib/stockSeasonality'

describe('calculatePeriodAvgReturn', () => {
  it('回傳月均，不是總和', () => {
    // 強勢期 11,12,1,2,3,4 月：1.82+1.49+1.07+(-0.01)+1.13+1.46 = 6.96
    // 平均 = 6.96 / 6 = 1.16（舊實作回傳 6.96 總和）
    expect(calculatePeriodAvgReturn([11, 12, 1, 2, 3, 4])).toBeCloseTo(1.16, 2)
  })

  it('弱勢期 5-10 月也是月均', () => {
    // 0.30+0.11+1.28+(-0.01)+(-0.72)+0.91 = 1.87 → 平均 ≈ 0.312
    expect(calculatePeriodAvgReturn([5, 6, 7, 8, 9, 10])).toBeCloseTo(1.87 / 6, 3)
  })

  it('空陣列 → 0（不除以零）', () => {
    expect(calculatePeriodAvgReturn([])).toBe(0)
  })
})

describe('getCurrentMonth — 時區感知', () => {
  // 2026-08-31T20:00:00Z：UTC 是 8/31 晚上，台北已是 9/1，紐約還是 8/31 下午
  const now = new Date('2026-08-31T20:00:00Z')

  it('Asia/Taipei (UTC+8) → 9 月', () => {
    expect(getCurrentMonth('Asia/Taipei', now)).toBe(9)
  })

  it('UTC → 8 月', () => {
    expect(getCurrentMonth('UTC', now)).toBe(8)
  })

  it('America/New_York (UTC-4) → 8 月', () => {
    expect(getCurrentMonth('America/New_York', now)).toBe(8)
  })
})

describe('analyzeSeasonality', () => {
  it('期間報酬為月均', () => {
    const analysis = analyzeSeasonality('Asia/Taipei')
    expect(analysis.strongPeriod.avgReturn).toBeCloseTo(1.16, 2)
    expect(analysis.weakPeriod.avgReturn).toBeCloseTo(1.87 / 6, 3)
  })
})
