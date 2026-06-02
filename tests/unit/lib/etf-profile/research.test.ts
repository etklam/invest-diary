import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearCache } from '~/lib/etf-profile/cache'

const mockAggregateEtfProfile = vi.fn()
const mockFetchMonthlyData = vi.fn()

vi.mock('~/lib/etf-profile/aggregator', () => ({
  aggregateEtfProfile: mockAggregateEtfProfile,
}))

vi.mock('~/lib/yahoo-finance', () => ({
  fetchMonthlyData: mockFetchMonthlyData,
}))

describe('ETF research reader', () => {
  beforeEach(() => {
    clearCache()
    vi.clearAllMocks()
    mockAggregateEtfProfile.mockReset()
    mockFetchMonthlyData.mockReset()
    mockAggregateEtfProfile.mockResolvedValue({
      symbol: 'SPY',
      risk: {},
      valuation: {
        aum: 1000,
        expenseRatioPct: null,
        pe: null,
        pb: null,
        dividendYieldPct: null,
      },
      rs: {
        benchmark: 'QQQ',
        period: '3m',
        relativeReturnPct: null,
        trend: 'unknown',
      },
      meta: {
        asOf: null,
        fetchedAt: '2026-01-01T00:00:00.000Z',
        isStale: false,
        sources: {
          'valuation.aum': 'provider-a',
        },
      },
    })
    mockFetchMonthlyData
      .mockResolvedValueOnce([
        { timestamp: 1, adjClose: 100, volume: 1000 },
        { timestamp: 2, adjClose: 110, volume: 1200 },
      ])
      .mockResolvedValueOnce([
        { timestamp: 1, adjClose: 100 },
        { timestamp: 2, adjClose: 105 },
      ])
  })

  it('returns one research profile with calculated risk, RS, and provider valuation', async () => {
    const { readEtfResearch } = await import('~/lib/etf-profile/research')

    const result = await readEtfResearch({
      symbol: ' spy ',
      benchmark: 'QQQ',
      period: '3m',
    })

    expect(mockFetchMonthlyData).toHaveBeenNthCalledWith(1, 'SPY', 5)
    expect(mockFetchMonthlyData).toHaveBeenNthCalledWith(2, 'QQQ', 1)
    expect(result.symbol).toBe('SPY')
    expect(result.risk.week52High).toBe(110)
    expect(result.rs.relativeReturnPct).toBeCloseTo(5, 6)
    expect(result.valuation.aum).toBe(1000)
  })

  it('reuses one cached research profile for repeated reads', async () => {
    const { readEtfResearch } = await import('~/lib/etf-profile/research')
    const input = {
      symbol: 'SPY',
      benchmark: 'QQQ' as const,
      period: '3m' as const,
    }

    const first = await readEtfResearch(input)
    const second = await readEtfResearch(input)

    expect(second).toEqual(first)
    expect(mockAggregateEtfProfile).toHaveBeenCalledTimes(1)
    expect(mockFetchMonthlyData).toHaveBeenCalledTimes(2)
  })

  it('returns stale cached research when a refresh fails', async () => {
    const { readEtfResearch } = await import('~/lib/etf-profile/research')
    const input = {
      symbol: 'SPY',
      benchmark: 'QQQ' as const,
      period: '3m' as const,
    }
    const fresh = await readEtfResearch(input)
    mockAggregateEtfProfile.mockRejectedValue(new Error('providers unavailable'))
    mockFetchMonthlyData.mockRejectedValue(new Error('Yahoo unavailable'))

    const stale = await readEtfResearch({
      ...input,
      bypassCache: true,
    })

    expect(stale.risk).toEqual(fresh.risk)
    expect(stale.meta.isStale).toBe(true)
  })

  it('keeps provider valuation when monthly data is unavailable', async () => {
    mockFetchMonthlyData.mockReset()
    mockFetchMonthlyData.mockRejectedValue(new Error('Yahoo history unavailable'))
    const { readEtfResearch } = await import('~/lib/etf-profile/research')

    const result = await readEtfResearch({
      symbol: 'SPY',
      benchmark: 'QQQ',
      period: '3m',
    })

    expect(result.valuation.aum).toBe(1000)
    expect(result.risk.week52High).toBeNull()
    expect(result.rs.relativeReturnPct).toBeNull()
    expect(result.meta.isStale).toBe(true)
    expect(result.meta.sources).toEqual({
      'valuation.aum': 'provider-a',
    })
  })
})
