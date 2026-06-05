import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery } from '../vi-setup'

const mockMarketBreadthFindMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    marketBreadthDaily: {
      findMany: (...args: any[]) => mockMarketBreadthFindMany(...args),
    },
  },
}))

function decimal(value: number) {
  return { toNumber: () => value, valueOf: () => value }
}

function makeBreadthRow(date: string, overrides: Record<string, unknown> = {}) {
  return {
    id: 1n,
    universeKey: 'SP500_NDX',
    date: new Date(`${date}T00:00:00.000Z`),
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

describe('GET /api/market/marketbee/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetQuery.mockReturnValue({})
    mockMarketBreadthFindMany.mockResolvedValue([makeBreadthRow('2026-06-05')])
  })

  it('預設 days=120', async () => {
    const { default: handler } = await import('~/server/api/market/marketbee/history.get')

    await handler({ context: { requestId: 'req-1' } } as any)

    expect(mockMarketBreadthFindMany).toHaveBeenCalledWith({
      where: { universeKey: 'SP500_NDX' },
      orderBy: { date: 'desc' },
      take: 120,
    })
  })

  it('支援自訂 days', async () => {
    mockGetQuery.mockReturnValue({ days: '30' })

    const { default: handler } = await import('~/server/api/market/marketbee/history.get')
    const result = await handler({ context: { requestId: 'req-1' } } as any)

    expect(mockMarketBreadthFindMany).toHaveBeenCalledWith({
      where: { universeKey: 'SP500_NDX' },
      orderBy: { date: 'desc' },
      take: 30,
    })
    expect(result).toEqual([
      {
        date: '2026-06-05',
        up4: 512,
        down4: 83,
        up4Pct: 63.5,
        down4Pct: 10.3,
        ratio10d: 2.8,
        above40dPct: 63.2,
        regime: 'RISK_ON',
      },
    ])
  })

  it('days 超過 365 時 clamp', async () => {
    mockGetQuery.mockReturnValue({ days: '999' })

    const { default: handler } = await import('~/server/api/market/marketbee/history.get')
    await handler({ context: { requestId: 'req-1' } } as any)

    expect(mockMarketBreadthFindMany).toHaveBeenCalledWith({
      where: { universeKey: 'SP500_NDX' },
      orderBy: { date: 'desc' },
      take: 365,
    })
  })
})
