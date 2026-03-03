import { describe, expect, it } from 'vitest'
import { computeRelativeStrength } from '~/lib/etf-profile/calculators/rs'

describe('relative strength calculator', () => {
  it('computes relative return against benchmark', () => {
    const symbol = [{ close: 100 }, { close: 110 }]
    const benchmark = [{ close: 100 }, { close: 105 }]

    const result = computeRelativeStrength(symbol as any, benchmark as any, '1m')
    expect(result.relativeReturnPct).toBeCloseTo(5, 6) // 10% - 5%
  })

  it('returns unknown trend when insufficient data', () => {
    const result = computeRelativeStrength([{ close: 100 }] as any, [{ close: 100 }] as any, '1m')
    expect(result.trend).toBe('unknown')
    expect(result.relativeReturnPct).toBeNull()
  })
})
