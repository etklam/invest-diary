import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery } from '../vi-setup'

const mockMarketBreadthFindFirst = vi.fn()
const mockMarketBreadthFindMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    marketBreadthDaily: {
      findFirst: (...args: any[]) => mockMarketBreadthFindFirst(...args),
      findMany: (...args: any[]) => mockMarketBreadthFindMany(...args),
    },
  },
}))

function decimal(value: number) {
  return { toNumber: () => value, valueOf: () => value }
}

function makeBreadthRow(date = '2026-06-05', overrides: Record<string, unknown> = {}) {
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

describe('GET /api/market/state/snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  it('returns canonical marketState without exposing legacy regime', async () => {
    mockMarketBreadthFindFirst.mockResolvedValue(makeBreadthRow())

    const { default: handler } = await import('~/server/api/market/state/snapshot.get')
    const result = await handler({ context: { requestId: 'req-1' } } as any)

    expect(result.marketState).toBe('risk_on')
    expect(result.regime).toBeUndefined()
    expect(result.message).toContain('Risk-on')
  })
})

describe('GET /api/market/state/history', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
    mockGetQuery.mockReturnValue({})
  })

  it('returns canonical marketState history and honors days query', async () => {
    mockGetQuery.mockReturnValue({ days: '30' })
    mockMarketBreadthFindMany.mockResolvedValue([makeBreadthRow('2026-06-05')])

    const { default: handler } = await import('~/server/api/market/state/history.get')
    const result = await handler({ context: { requestId: 'req-1' } } as any)

    expect(mockMarketBreadthFindMany).toHaveBeenCalledWith({
      where: { universeKey: 'SP500_NDX' },
      orderBy: { date: 'desc' },
      take: 30,
    })
    expect(result[0].marketState).toBe('risk_on')
    expect(result[0].regime).toBeUndefined()
  })
})
