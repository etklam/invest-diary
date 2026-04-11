import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetQuery } from '../vi-setup'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockPortfolioSnapshotFindMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    portfolioSnapshot: { findMany: mockPortfolioSnapshotFindMany },
  },
}))

// ─── 測試資料 ─────────────────────────────────────────────────────────────────

function makeSnapshot(overrides: {
  id?: bigint
  snapshotDate?: Date
  totalCost?: number
  totalMarketValue?: number
  benchmarkPrice?: number
  benchmarkSymbol?: string
  holdingsJson?: string
}) {
  return {
    id: overrides.id ?? 1n,
    snapshotDate: overrides.snapshotDate ?? new Date('2026-01-15'),
    totalCost: { valueOf: () => overrides.totalCost ?? 1000 },
    totalMarketValue: { valueOf: () => overrides.totalMarketValue ?? 1200 },
    benchmarkPrice: { valueOf: () => overrides.benchmarkPrice ?? 500 },
    benchmarkSymbol: overrides.benchmarkSymbol ?? 'SPY',
    holdingsJson: overrides.holdingsJson ?? JSON.stringify([{ symbol: 'AAPL', quantity: 10, avgCost: 100, latestPrice: 120 }]),
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/stats/snapshots', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
  })

  it('未認證 → 401', async () => {
    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshots.get')
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('無快照 → 回傳空陣列', async () => {
    mockPortfolioSnapshotFindMany.mockResolvedValue([])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshots.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.snapshots).toEqual([])
    expect(result.benchmarkSymbol).toBe('SPY')
  })

  it('一筆快照 → portfolioReturnPct 和 benchmarkReturnPct 均為 0（第一筆為基準）', async () => {
    mockPortfolioSnapshotFindMany.mockResolvedValue([
      makeSnapshot({ totalCost: 1000, totalMarketValue: 1200, benchmarkPrice: 500 }),
    ])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshots.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    // 第一筆快照本身就是基準，所以報酬率以第一筆 totalCost 計算
    // portfolioReturnPct = (1200 - 1000) / 1000 * 100 = 20
    expect(result.snapshots[0].portfolioReturnPct).toBeCloseTo(20, 1)
    expect(result.snapshots[0].benchmarkReturnPct).toBeCloseTo(0, 1)
  })

  it('多筆快照 → 第二筆的相對報酬率計算正確', async () => {
    mockPortfolioSnapshotFindMany.mockResolvedValue([
      makeSnapshot({ id: 1n, snapshotDate: new Date('2026-01-01'), totalCost: 1000, totalMarketValue: 1000, benchmarkPrice: 400 }),
      makeSnapshot({ id: 2n, snapshotDate: new Date('2026-02-01'), totalCost: 1000, totalMarketValue: 1200, benchmarkPrice: 440 }),
    ])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshots.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.snapshots).toHaveLength(2)
    // 第二筆：portfolioReturnPct = (1200 - 1000) / 1000 * 100 = 20（以第一筆 totalCost 1000 為基準）
    expect(result.snapshots[1].portfolioReturnPct).toBeCloseTo(20, 1)
    // benchmarkReturnPct = (440 - 400) / 400 * 100 = 10
    expect(result.snapshots[1].benchmarkReturnPct).toBeCloseTo(10, 1)
  })

  it('回傳正確欄位結構', async () => {
    mockPortfolioSnapshotFindMany.mockResolvedValue([
      makeSnapshot({}),
    ])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshots.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    const snap = result.snapshots[0]
    expect(snap).toHaveProperty('id')
    expect(snap).toHaveProperty('snapshotDate')
    expect(snap).toHaveProperty('totalCost')
    expect(snap).toHaveProperty('totalMarketValue')
    expect(snap).toHaveProperty('unrealizedPnL')
    expect(snap).toHaveProperty('portfolioReturnPct')
    expect(snap).toHaveProperty('benchmarkPrice')
    expect(snap).toHaveProperty('benchmarkReturnPct')
    expect(snap).toHaveProperty('holdingsCount')
  })

  it('limit query param 傳遞至 prisma findMany', async () => {
    mockGetQuery.mockReturnValue({ limit: '30' })
    mockPortfolioSnapshotFindMany.mockResolvedValue([])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshots.get')
    await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(mockPortfolioSnapshotFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 30 })
    )
  })

  it('holdingsCount 由 holdingsJson 解析', async () => {
    mockPortfolioSnapshotFindMany.mockResolvedValue([
      makeSnapshot({
        holdingsJson: JSON.stringify([
          { symbol: 'AAPL', quantity: 10, avgCost: 100, latestPrice: 120 },
          { symbol: 'TSLA', quantity: 5, avgCost: 200, latestPrice: 180 },
        ]),
      }),
    ])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshots.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.snapshots[0].holdingsCount).toBe(2)
  })
})
