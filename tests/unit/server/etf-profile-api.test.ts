import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery, mockGetRouterParam } from '../../vi-setup'

const mockAggregateEtfProfile = vi.fn()
const mockComputeRiskMetrics = vi.fn()
const mockComputeRelativeStrength = vi.fn()

vi.mock('~/lib/etf-profile/aggregator', () => ({
  aggregateEtfProfile: mockAggregateEtfProfile,
}))

vi.mock('~/lib/etf-profile/calculators/risk', () => ({
  computeRiskMetrics: mockComputeRiskMetrics,
}))

vi.mock('~/lib/etf-profile/calculators/rs', () => ({
  computeRelativeStrength: mockComputeRelativeStrength,
}))

describe('etf profile api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetRouterParam.mockReturnValue('SPY')
    mockGetQuery.mockReturnValue({})
  })

  it('returns 400 when rs benchmark is invalid', async () => {
    mockGetQuery.mockReturnValue({ benchmark: 'INVALID', period: '3m' })
    const { default: handler } = await import('~/server/api/etf/[symbol]/rs.get')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400,
      statusMessage: 'Invalid benchmark',
    })
  })

  it('returns partial profile with stale flag when aggregation fails', async () => {
    mockAggregateEtfProfile.mockRejectedValue(new Error('provider failed'))
    const { default: handler } = await import('~/server/api/etf/[symbol]/profile.get')

    const result = await handler({ context: {} } as any)
    expect(result.symbol).toBe('SPY')
    expect(result.meta.isStale).toBe(true)
    expect(result.valuation.aum).toBeNull()
    expect(result.rs.relativeReturnPct).toBeNull()
  })
})
