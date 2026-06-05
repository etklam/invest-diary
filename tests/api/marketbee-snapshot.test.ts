import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockMarketBreadthFindFirst = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    marketBreadthDaily: {
      findFirst: (...args: any[]) => mockMarketBreadthFindFirst(...args),
    },
  },
}))

function decimal(value: number) {
  return { toNumber: () => value, valueOf: () => value }
}

function makeBreadthRow(overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    universeKey: 'SP500_NDX',
    date: new Date('2026-06-05T00:00:00.000Z'),
    universeCount: 806,
    up4Count: 512,
    down4Count: 83,
    up4Pct: decimal(63.5),
    down4Pct: decimal(10.3),
    above40dCount: 509,
    above40dPct: decimal(63.2),
    ratio5d: decimal(2.1),
    ratio10d: decimal(2.8),
    regime: 'RISK_ON',
    score: 78,
    coveragePct: decimal(98.7),
    isStale: false,
    createdAt: new Date('2026-06-05T01:00:00.000Z'),
    updatedAt: new Date('2026-06-05T01:00:00.000Z'),
    ...overrides,
  }
}

describe('GET /api/market/marketbee/snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('正常返回最新 market regime snapshot', async () => {
    mockMarketBreadthFindFirst.mockResolvedValue(makeBreadthRow())

    const { default: handler } = await import('~/server/api/market/marketbee/snapshot.get')
    const result = await handler({ context: { requestId: 'req-1' } } as any)

    expect(mockMarketBreadthFindFirst).toHaveBeenCalledWith({
      where: { universeKey: 'SP500_NDX' },
      orderBy: { date: 'desc' },
    })
    expect(result).toEqual({
      universeKey: 'SP500_NDX',
      date: '2026-06-05',
      latestPriceDate: '2026-06-05',
      coveragePct: 98.7,
      isStale: false,
      regime: 'RISK_ON',
      score: 78,
      up4: 512,
      down4: 83,
      up4Pct: 63.5,
      down4Pct: 10.3,
      ratio10d: 2.8,
      above40dPct: 63.2,
      suggestedExposure: '80-100%',
      message: 'Bullish thrust confirmed. Favor leading ETFs.',
    })
  })

  it('無數據時返回 404', async () => {
    mockMarketBreadthFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/market/marketbee/snapshot.get')

    await expect(handler({ context: { requestId: 'req-1' } } as any)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})

describe('getRegimeGuidance', () => {
  it('每個 regime 都有對應建議', async () => {
    const { getRegimeGuidance } = await import('~/server/utils/marketbee-queries')
    const regimes = ['BULLISH_THRUST', 'RISK_ON', 'NEUTRAL', 'RISK_OFF', 'CAPITULATION_WATCH'] as const

    for (const regime of regimes) {
      const guidance = getRegimeGuidance(regime)
      expect(guidance.suggestedExposure).toMatch(/%/)
      expect(guidance.message.length).toBeGreaterThan(0)
    }
  })
})
