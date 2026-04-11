import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetQuery } from '../vi-setup'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockTransactionFindMany = vi.fn()
const mockStocksLog = { debug: vi.fn(), error: vi.fn() }

vi.mock('~/lib/prisma', () => ({
  default: {
    transaction: { findMany: mockTransactionFindMany },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    stocks: { withRequestId: vi.fn(() => mockStocksLog) },
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
}) {
  return {
    id: overrides.id ?? 1n,
    symbol: overrides.symbol ?? 'AAPL',
    type: overrides.type,
    quantity: { valueOf: () => overrides.quantity },
    price: { valueOf: () => overrides.price },
    tradeDate: overrides.tradeDate ?? new Date('2024-06-01T12:00:00.000Z'),
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/stats/recent-trades', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
  })

  it('無交易記錄 → 返回空陣列', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    const { default: handler } = await import('~/server/api/stats/recent-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.trades).toEqual([])
  })

  it('未認證 → 401', async () => {
    const { default: handler } = await import('~/server/api/stats/recent-trades.get')
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('一買一賣（近期）→ 回傳已關閉交易', async () => {
    const recentDate = new Date()
    recentDate.setDate(recentDate.getDate() - 5)  // 5天前，在30天視窗內

    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, type: 'BUY', quantity: 10, price: 100, tradeDate: new Date(recentDate.getTime() - 86400000) }),
      makeTx({ id: 2n, type: 'SELL', quantity: 10, price: 120, tradeDate: recentDate }),
    ])

    const { default: handler } = await import('~/server/api/stats/recent-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-2' } } as any)

    expect(result.trades).toHaveLength(1)
    expect(result.trades[0].symbol).toBe('AAPL')
    expect(result.trades[0].realizedPnL).toBeCloseTo(200)
    expect(result.trades[0].realizedPnLPct).toBeCloseTo(20)
    expect(result.trades[0].sellQuantity).toBe(10)
    expect(result.trades[0].sellDate).toBeTruthy()
    expect(result.trades[0].id).toBeTruthy()
  })

  it('舊交易（超過30天）→ 不出現在結果中', async () => {
    const oldDate = new Date()
    oldDate.setDate(oldDate.getDate() - 40)  // 40天前，超出視窗

    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, type: 'BUY', quantity: 5, price: 100, tradeDate: new Date(oldDate.getTime() - 86400000) }),
      makeTx({ id: 2n, type: 'SELL', quantity: 5, price: 120, tradeDate: oldDate }),
    ])

    const { default: handler } = await import('~/server/api/stats/recent-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-3' } } as any)

    expect(result.trades).toHaveLength(0)
  })

  it('按 sellDate 降序排列（最新在前）', async () => {
    const now = new Date()
    const d1 = new Date(now.getTime() - 5 * 86400000)   // 5天前
    const d2 = new Date(now.getTime() - 10 * 86400000)  // 10天前

    mockTransactionFindMany.mockResolvedValue([
      // TSLA 較舊
      makeTx({ id: 1n, symbol: 'TSLA', type: 'BUY', quantity: 3, price: 200, tradeDate: new Date(d2.getTime() - 86400000) }),
      makeTx({ id: 2n, symbol: 'TSLA', type: 'SELL', quantity: 3, price: 220, tradeDate: d2 }),
      // AAPL 較新
      makeTx({ id: 3n, symbol: 'AAPL', type: 'BUY', quantity: 10, price: 100, tradeDate: new Date(d1.getTime() - 86400000) }),
      makeTx({ id: 4n, symbol: 'AAPL', type: 'SELL', quantity: 10, price: 110, tradeDate: d1 }),
    ])

    const { default: handler } = await import('~/server/api/stats/recent-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-4' } } as any)

    expect(result.trades).toHaveLength(2)
    expect(result.trades[0].symbol).toBe('AAPL')  // 最新的在前
    expect(result.trades[1].symbol).toBe('TSLA')
  })

  it('limit 參數控制最大回傳數量', async () => {
    mockGetQuery.mockReturnValue({ limit: '1' })

    const now = new Date()
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, symbol: 'A', type: 'BUY', quantity: 1, price: 100, tradeDate: new Date(now.getTime() - 2 * 86400000) }),
      makeTx({ id: 2n, symbol: 'A', type: 'SELL', quantity: 1, price: 110, tradeDate: new Date(now.getTime() - 86400000) }),
      makeTx({ id: 3n, symbol: 'B', type: 'BUY', quantity: 1, price: 100, tradeDate: new Date(now.getTime() - 4 * 86400000) }),
      makeTx({ id: 4n, symbol: 'B', type: 'SELL', quantity: 1, price: 90, tradeDate: new Date(now.getTime() - 3 * 86400000) }),
    ])

    const { default: handler } = await import('~/server/api/stats/recent-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-5' } } as any)

    expect(result.trades).toHaveLength(1)
  })

  it('DB 錯誤 → 500', async () => {
    mockTransactionFindMany.mockRejectedValue(new Error('DB error'))

    const { default: handler } = await import('~/server/api/stats/recent-trades.get')
    await expect(
      handler({ context: { user: { id: '1' }, requestId: 'req-err' } } as any)
    ).rejects.toMatchObject({ statusCode: 500 })
  })

  it('realizedPnL 四捨五入到小數點後2位', async () => {
    const now = new Date()
    const sellDate = new Date(now.getTime() - 2 * 86400000)

    // 故意造出無限小數：3 shares @ 100, sell @ 103.333...
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, type: 'BUY', quantity: 3, price: 100, tradeDate: new Date(sellDate.getTime() - 86400000) }),
      makeTx({ id: 2n, type: 'SELL', quantity: 3, price: 101.1111, tradeDate: sellDate }),
    ])

    const { default: handler } = await import('~/server/api/stats/recent-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-round' } } as any)

    expect(result.trades[0].realizedPnL).toBeCloseTo(3.33, 1)
    // 確認是 number 類型
    expect(typeof result.trades[0].realizedPnL).toBe('number')
  })
})
