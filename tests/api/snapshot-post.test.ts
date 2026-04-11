import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetQuery } from '../vi-setup'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockTransactionFindMany = vi.fn()
const mockPortfolioSnapshotUpsert = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    transaction: { findMany: mockTransactionFindMany },
    portfolioSnapshot: { upsert: mockPortfolioSnapshotUpsert },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    stocks: { withRequestId: vi.fn(() => ({ debug: vi.fn(), error: vi.fn(), warn: vi.fn() })) },
  },
}))

// ─── Yahoo Finance mock ───────────────────────────────────────────────────────

const mockFetchQuote = vi.fn()

vi.mock('~/lib/yahoo-finance', () => ({
  fetchQuote: (...args: unknown[]) => mockFetchQuote(...args),
}))

// ─── 測試資料 ─────────────────────────────────────────────────────────────────

function makeTx(overrides: {
  id?: bigint
  symbol?: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  tradeDate?: Date
}) {
  return {
    id: overrides.id ?? 1n,
    symbol: overrides.symbol ?? 'AAPL',
    type: overrides.type,
    quantity: { valueOf: () => overrides.quantity },
    price: { valueOf: () => overrides.price },
    tradeDate: overrides.tradeDate ?? new Date('2026-01-15T12:00:00.000Z'),
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/stats/snapshot', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
    mockPortfolioSnapshotUpsert.mockResolvedValue({
      id: 1n,
      snapshotDate: new Date('2026-04-12'),
      totalCost: 1000,
      totalMarketValue: 1200,
      benchmarkPrice: 500,
      benchmarkSymbol: 'SPY',
    })
  })

  it('未認證 → 401', async () => {
    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshot.post')
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('無持倉 → 快照 holdingsCount = 0', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshot.post')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.holdingsCount).toBe(0)
    expect(result.totalCost).toBe(0)
  })

  it('一筆 BUY 持倉 → 呼叫 fetchQuote 並回傳正確 totalMarketValue', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, symbol: 'AAPL', type: 'BUY', quantity: 10, price: 100 }),
    ])
    mockFetchQuote.mockImplementation(async (symbol: string) => {
      if (symbol === 'AAPL') return { regularMarketPrice: 150 }
      if (symbol === 'SPY') return { regularMarketPrice: 500 }
      throw new Error('Unknown symbol')
    })

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshot.post')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    // AAPL: 10 shares * $150 = $1500
    expect(result.totalMarketValue).toBe(1500)
    expect(result.holdingsCount).toBe(1)
    expect(result.benchmarkPrice).toBe(500)
  })

  it('fetchQuote 失敗 → fallback 使用平均成本', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, symbol: 'UNKN', type: 'BUY', quantity: 5, price: 200 }),
    ])
    // All quotes fail
    mockFetchQuote.mockRejectedValue(new Error('Network error'))

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshot.post')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    // Fallback: 5 * 200 (avgCost) = 1000
    expect(result.totalMarketValue).toBe(1000)
    expect(result.benchmarkPrice).toBe(0) // benchmark also failed
  })

  it('回傳正確欄位結構', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshot.post')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result).toHaveProperty('id')
    expect(result).toHaveProperty('snapshotDate')
    expect(result).toHaveProperty('totalCost')
    expect(result).toHaveProperty('totalMarketValue')
    expect(result).toHaveProperty('benchmarkSymbol')
    expect(result).toHaveProperty('benchmarkPrice')
    expect(result).toHaveProperty('holdingsCount')
  })

  it('已有今日快照 → upsert（不新增重複）', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/snapshot.post')
    await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    // upsert 只被呼叫一次
    expect(mockPortfolioSnapshotUpsert).toHaveBeenCalledTimes(1)
    const upsertCall = mockPortfolioSnapshotUpsert.mock.calls[0][0]
    expect(upsertCall).toHaveProperty('where')
    expect(upsertCall).toHaveProperty('update')
    expect(upsertCall).toHaveProperty('create')
  })
})
