import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery, mockGetRouterParam } from '../../vi-setup'

const mockReadEtfResearch = vi.fn()

vi.mock('~/lib/etf-profile/research', () => ({
  readEtfResearch: mockReadEtfResearch,
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
      statusMessage: 'Validation failed',
    })
  })

  it('returns the research profile from the centralized reader', async () => {
    mockGetRouterParam.mockReturnValue(' spy ')
    mockGetQuery.mockReturnValue({ nocache: '1' })
    const profile = {
      symbol: 'SPY',
      risk: { week52High: 600 },
      valuation: { aum: 1000 },
      rs: { benchmark: 'SPY', period: '3m', relativeReturnPct: 2 },
      meta: { isStale: false },
    }
    mockReadEtfResearch.mockResolvedValue(profile)
    const { default: handler } = await import('~/server/api/etf/[symbol]/profile.get')

    const result = await handler({ context: {} } as any)

    expect(mockReadEtfResearch).toHaveBeenCalledWith({
      symbol: 'SPY',
      benchmark: 'SPY',
      period: '3m',
      bypassCache: true,
    })
    expect(result).toBe(profile)
  })

  it('returns the risk slice from the centralized reader', async () => {
    const meta = { asOf: null, fetchedAt: '2026-01-01T00:00:00.000Z', isStale: false, sources: {} }
    mockReadEtfResearch.mockResolvedValue({
      risk: { week52High: 600 },
      meta,
    })
    const { default: handler } = await import('~/server/api/etf/[symbol]/risk.get')

    const result = await handler({ context: {} } as any)

    expect(mockReadEtfResearch).toHaveBeenCalledWith({
      symbol: 'SPY',
      benchmark: 'SPY',
      period: '3m',
      bypassCache: false,
    })
    expect(result).toEqual({ week52High: 600, asOf: null, meta })
  })

  it('returns the valuation slice from the centralized reader', async () => {
    const meta = { asOf: null, fetchedAt: '2026-01-01T00:00:00.000Z', isStale: false, sources: {} }
    mockReadEtfResearch.mockResolvedValue({
      valuation: { aum: 1000 },
      meta,
    })
    const { default: handler } = await import('~/server/api/etf/[symbol]/valuation.get')

    const result = await handler({ context: {} } as any)

    expect(mockReadEtfResearch).toHaveBeenCalledWith({
      symbol: 'SPY',
      benchmark: 'SPY',
      period: '3m',
      bypassCache: false,
    })
    expect(result).toEqual({ aum: 1000, meta })
  })

  it('returns the selected RS slice from the centralized reader', async () => {
    mockGetQuery.mockReturnValue({ benchmark: 'qqq', period: '6m', nocache: 'true' })
    const meta = { asOf: null, fetchedAt: '2026-01-01T00:00:00.000Z', isStale: false, sources: {} }
    mockReadEtfResearch.mockResolvedValue({
      rs: { benchmark: 'QQQ', period: '6m', relativeReturnPct: 2, trend: 'strengthening' },
      meta,
    })
    const { default: handler } = await import('~/server/api/etf/[symbol]/rs.get')

    const result = await handler({ context: {} } as any)

    expect(mockReadEtfResearch).toHaveBeenCalledWith({
      symbol: 'SPY',
      benchmark: 'QQQ',
      period: '6m',
      bypassCache: true,
    })
    expect(result).toEqual({
      benchmark: 'QQQ',
      period: '6m',
      relativeReturnPct: 2,
      trend: 'strengthening',
      asOf: null,
      meta,
    })
  })
})
