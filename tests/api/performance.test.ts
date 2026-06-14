import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetQuery } from '../vi-setup'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockTransactionFindMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    transaction: { findMany: mockTransactionFindMany },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    stocks: { withRequestId: vi.fn(() => ({ debug: vi.fn(), error: vi.fn() })) },
  },
}))

// ─── 測試資料 ────────────────────────────────────────────────────────────────

function makeTx(overrides: {
  id?: bigint
  symbol?: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
  tradeDate?: Date
  strategy?: string | null
  emotion?: string | null
}) {
  return {
    id: overrides.id ?? 1n,
    symbol: overrides.symbol ?? 'AAPL',
    type: overrides.type,
    quantity: { valueOf: () => overrides.quantity },
    price: { valueOf: () => overrides.price },
    tradeDate: overrides.tradeDate ?? new Date('2026-01-15T12:00:00.000Z'),
    strategy: overrides.strategy ?? null,
    emotion: overrides.emotion ?? null,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/stats/performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({ period: 'month' })
  })

  it('未認證 → 401', async () => {
    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/performance.get')
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('無交易記錄 → 回傳空摘要和 equityCurve', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.summary.totalClosedTrades).toBe(0)
    expect(result.equityCurve).toEqual([])
    expect(result.periodStats).toEqual([])
  })

  it('一筆 BUY + 一筆 SELL → equityCurve 有一個點且 cumPnL 正確', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, type: 'BUY', quantity: 10, price: 100, tradeDate: new Date('2026-01-10T12:00:00.000Z') }),
      makeTx({ id: 2n, type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2026-01-20T12:00:00.000Z') }),
    ])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.equityCurve).toHaveLength(1)
    expect(result.equityCurve[0].date).toBe('2026-01-20')
    expect(result.equityCurve[0].cumPnL).toBeCloseTo(200, 1) // (120-100)*10 = 200
  })

  it('多筆交易 → equityCurve 累積計算正確', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, symbol: 'AAPL', type: 'BUY', quantity: 10, price: 100, tradeDate: new Date('2026-01-01T12:00:00.000Z') }),
      makeTx({ id: 2n, symbol: 'AAPL', type: 'SELL', quantity: 10, price: 110, tradeDate: new Date('2026-01-10T12:00:00.000Z') }),
      makeTx({ id: 3n, symbol: 'TSLA', type: 'BUY', quantity: 5, price: 200, tradeDate: new Date('2026-01-15T12:00:00.000Z') }),
      makeTx({ id: 4n, symbol: 'TSLA', type: 'SELL', quantity: 5, price: 180, tradeDate: new Date('2026-01-25T12:00:00.000Z') }),
    ])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    // AAPL: +100，TSLA: -100，合計 0
    expect(result.equityCurve).toHaveLength(2)
    expect(result.equityCurve[0].cumPnL).toBeCloseTo(100, 1)   // 第一筆 AAPL 賣出後
    expect(result.equityCurve[1].cumPnL).toBeCloseTo(0, 1)     // TSLA 虧損後累計
    expect(result.symbolBreakdown).toHaveLength(2)
  })
})
