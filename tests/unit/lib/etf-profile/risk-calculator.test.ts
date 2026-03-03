import { describe, expect, it } from 'vitest'
import { computeRiskMetrics } from '~/lib/etf-profile/calculators/risk'

const series = [
  { close: 100, volume: 1000 },
  { close: 95, volume: 1200 },
  { close: 110, volume: 900 },
  { close: 105, volume: 1300 },
  { close: 115, volume: 1400 },
]

describe('risk calculator', () => {
  it('computes 52w levels and volume spike ratio', () => {
    const metrics = computeRiskMetrics(series as any)
    expect(metrics.week52High).toBe(115)
    expect(metrics.week52Low).toBe(95)
    expect(metrics.avgVolume20d).toBeGreaterThan(0)
    expect(metrics.volumeSpikeRatio).toBeCloseTo(1400 / ((1000 + 1200 + 900 + 1300 + 1400) / 5), 6)
  })

  it('returns non-positive drawdown and finite vol numbers when enough data exists', () => {
    const metrics = computeRiskMetrics(series as any)
    expect(metrics.maxDrawdown1yPct).toBeLessThanOrEqual(0)
    expect(Number.isFinite(metrics.volatility20dAnn ?? NaN)).toBe(true)
  })
})
