import { describe, it, expect } from 'vitest'
import {
  calculateFinancialFreedom,
  generateYearlyProjection,
  calculateFireNumber,
  type FinancialFreedomInput
} from '~/lib/financialFreedom'

// ponytail: 這個 check 直接鎖定「currentAge 不再焊死 30」這個 bug。
// 純函數 generateYearlyProjection 早就接受 currentAge，但 orchestrator
// calculateFinancialFreedom 把它焊死成 30 — 純函數測試全綠也看不到。
// 這裡覆蓋 orchestrator 對 currentAge 的傳遞與對 retirement age 預測的影響。

const baseInput = (overrides: Partial<FinancialFreedomInput> = {}): FinancialFreedomInput => ({
  annualExpenses: 600000,
  currentAssets: 1_000_000,
  monthlyContribution: 20_000,
  expectedReturn: 8,
  withdrawalRate: 4,
  inflationRate: 2,
  yearsToRetirement: null,
  ...overrides
})

describe('calculateFireNumber', () => {
  it('computes FIRE number from annual expenses and withdrawal rate', () => {
    // 60萬 / 4% = 1500萬
    expect(calculateFireNumber(600_000, 4)).toBe(15_000_000)
  })

  it('returns 0 for non-positive withdrawal rate', () => {
    expect(calculateFireNumber(600_000, 0)).toBe(0)
  })
})

describe('generateYearlyProjection — currentAge propagation', () => {
  it('uses currentAge to compute age for each projected year', () => {
    const fireNumber = 15_000_000
    const projection = generateYearlyProjection(1_000_000, 20_000, 8, fireNumber, 25, 5)

    expect(projection.length).toBeGreaterThan(0)
    expect(projection[0].age).toBe(26) // 25 + 第一年
    expect(projection[1].age).toBe(27)
    expect(projection[2].age).toBe(28)
  })

  it('returns age = null for every year when currentAge is null', () => {
    const projection = generateYearlyProjection(1_000_000, 20_000, 8, 15_000_000, null, 5)

    expect(projection.every(p => p.age === null)).toBe(true)
  })
})

describe('calculateFinancialFreedom — currentAge flow (regression for hardcoded 30)', () => {
  it('propagates currentAge = 40 into yearly projection (NOT hardcoded 30)', () => {
    const result = calculateFinancialFreedom(baseInput({ currentAge: 40 }))

    expect(result.yearlyProjection.length).toBeGreaterThan(0)
    // 若 currentAge 仍是焊死 30，第一年會是 31；這裡斷言 41 才正確
    expect(result.yearlyProjection[0].age).toBe(41)
    expect(result.yearlyProjection[1].age).toBe(42)
  })

  it('propagates currentAge = 25 into yearly projection', () => {
    const result = calculateFinancialFreedom(baseInput({ currentAge: 25 }))

    expect(result.yearlyProjection[0].age).toBe(26)
    expect(result.yearlyProjection[1].age).toBe(27)
  })

  it('produces DIFFERENT age sequences for different currentAge (the bug was invisible to pure-fn tests)', () => {
    const age25 = calculateFinancialFreedom(baseInput({ currentAge: 25 }))
    const age40 = calculateFinancialFreedom(baseInput({ currentAge: 40 }))

    // 同一個年份的 age 必須不同 — 之前 orchestrator 焊死 30 時兩者會一樣
    expect(age25.yearlyProjection[0].age).not.toBe(age40.yearlyProjection[0].age)
    expect(age25.yearlyProjection[0].age).toBe(26)
    expect(age40.yearlyProjection[0].age).toBe(41)
  })

  it('treats missing currentAge as null (no fake 30 default)', () => {
    // 不傳 currentAge 應該是 null（不顯示年齡），不是悄悄用 30
    const result = calculateFinancialFreedom(baseInput())

    expect(result.yearlyProjection.every(p => p.age === null)).toBe(true)
  })

  it('does not let currentAge affect financial calculations (only age display)', () => {
    // currentAge 純粹是顯示用，不應影響 fireNumber / yearsToFreedom / amountNeeded
    const age25 = calculateFinancialFreedom(baseInput({ currentAge: 25 }))
    const age40 = calculateFinancialFreedom(baseInput({ currentAge: 40 }))

    expect(age25.fireNumber).toBe(age40.fireNumber)
    expect(age25.yearsToFreedom).toBe(age40.yearsToFreedom)
    expect(age25.amountNeeded).toBe(age40.amountNeeded)
  })
})
