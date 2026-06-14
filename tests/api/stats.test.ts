import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetQuery } from '../vi-setup'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockTransactionFindMany = vi.fn()
const mockStocksLogDebug = vi.fn()
const mockStocksLogError = vi.fn()
const mockStocksLog = {
  debug: mockStocksLogDebug,
  error: mockStocksLogError,
}

vi.mock('~/lib/prisma', () => ({
  default: {
    transaction: {
      findMany: mockTransactionFindMany,
    },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    stocks: {
      withRequestId: vi.fn(() => mockStocksLog),
    },
  },
}))

// ─── 測試資料輔助 ─────────────────────────────────────────────────────────────

const now = new Date('2024-06-01T12:00:00.000Z')

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
    quantity: { valueOf: () => overrides.quantity },  // Decimal-like
    price: { valueOf: () => overrides.price },
    tradeDate: overrides.tradeDate ?? now,
    strategy: overrides.strategy ?? null,
    emotion: overrides.emotion ?? null,
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/stats/performance', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
  })

  it('無交易記錄 → 返回空統計', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.summary.totalClosedTrades).toBe(0)
    expect(result.summary.totalRealizedPnL).toBe(0)
    expect(result.summary.winRate).toBe(0)
    expect(result.periodStats).toEqual([])
    expect(result.topWins).toEqual([])
    expect(result.topLosses).toEqual([])
  })

  it('未認證 → 401', async () => {
    const { default: handler } = await import('~/server/api/stats/performance.get')
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('一買一賣 → 正確計算勝率和損益', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, type: 'BUY',  quantity: 10, price: 100, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: 2n, type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-02-01') }),
    ])

    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-2' } } as any)

    expect(result.summary.totalClosedTrades).toBe(1)
    expect(result.summary.totalRealizedPnL).toBeCloseTo(200)   // (120-100)*10
    expect(result.summary.winRate).toBeCloseTo(100)
    expect(result.summary.wins).toBe(1)
    expect(result.summary.losses).toBe(0)
    expect(result.topWins).toHaveLength(1)
    expect(result.topLosses).toHaveLength(0)
  })

  it('2 贏 1 輸 → 勝率 66.67%', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, symbol: 'AAPL', type: 'BUY',  quantity: 10, price: 100, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: 2n, symbol: 'AAPL', type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-02-01') }),
      makeTx({ id: 3n, symbol: 'TSLA', type: 'BUY',  quantity: 5,  price: 200, tradeDate: new Date('2024-01-10') }),
      makeTx({ id: 4n, symbol: 'TSLA', type: 'SELL', quantity: 5,  price: 180, tradeDate: new Date('2024-02-10') }),
      makeTx({ id: 5n, symbol: 'NVDA', type: 'BUY',  quantity: 2,  price: 500, tradeDate: new Date('2024-02-01') }),
      makeTx({ id: 6n, symbol: 'NVDA', type: 'SELL', quantity: 2,  price: 600, tradeDate: new Date('2024-03-01') }),
    ])

    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-3' } } as any)

    expect(result.summary.totalClosedTrades).toBe(3)
    expect(result.summary.wins).toBe(2)
    expect(result.summary.losses).toBe(1)
    expect(result.summary.winRate).toBeCloseTo(66.667)
    expect(result.symbolBreakdown).toHaveLength(3)
  })

  it('period=quarter → periodStats 按季分群', async () => {
    mockGetQuery.mockReturnValue({ period: 'quarter' })
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, type: 'BUY',  quantity: 10, price: 100, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: 2n, type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-02-01') }),
    ])

    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-4' } } as any)

    expect(result.periodStats[0].period).toBe('2024-Q1')
  })

  it('symbol 過濾 → 只分析指定股票', async () => {
    // mock 只返回過濾後的資料（DB 側過濾）
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, symbol: 'AAPL', type: 'BUY',  quantity: 10, price: 100, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: 2n, symbol: 'AAPL', type: 'SELL', quantity: 10, price: 130, tradeDate: new Date('2024-02-01') }),
    ])
    mockGetQuery.mockReturnValue({ symbol: 'aapl' })  // 小寫，測試正規化

    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-5' } } as any)

    expect(result.summary.totalClosedTrades).toBe(1)
    expect(result.symbolBreakdown[0].symbol).toBe('AAPL')
    // 確認 query 傳了 symbol 條件
    expect(mockTransactionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ symbol: 'AAPL' }),
      })
    )
  })

  it('DB 錯誤 → 500', async () => {
    mockTransactionFindMany.mockRejectedValue(new Error('DB connection lost'))

    const { default: handler } = await import('~/server/api/stats/performance.get')
    await expect(
      handler({ context: { user: { id: '1' }, requestId: 'req-err' } } as any)
    ).rejects.toMatchObject({ statusCode: 500 })
  })

  it('periodStats 按時間升序返回', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, type: 'BUY',  quantity: 5, price: 100, tradeDate: new Date('2024-03-01') }),
      makeTx({ id: 2n, type: 'SELL', quantity: 5, price: 110, tradeDate: new Date('2024-04-01') }),
      makeTx({ id: 3n, type: 'BUY',  quantity: 5, price: 100, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: 4n, type: 'SELL', quantity: 5, price: 120, tradeDate: new Date('2024-02-01') }),
    ])

    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-6' } } as any)

    const periods = result.periodStats.map((p: any) => p.period)
    expect(periods).toEqual([...periods].sort())
  })

  it('topWins 只包含正損益交易，topLosses 只包含負損益', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, symbol: 'A', type: 'BUY',  quantity: 1, price: 100, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: 2n, symbol: 'A', type: 'SELL', quantity: 1, price: 150, tradeDate: new Date('2024-02-01') }), // +50
      makeTx({ id: 3n, symbol: 'B', type: 'BUY',  quantity: 1, price: 100, tradeDate: new Date('2024-01-05') }),
      makeTx({ id: 4n, symbol: 'B', type: 'SELL', quantity: 1, price: 80,  tradeDate: new Date('2024-02-05') }), // -20
    ])

    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-7' } } as any)

    expect(result.topWins.every((t: any) => t.realizedPnL > 0)).toBe(true)
    expect(result.topLosses.every((t: any) => t.realizedPnL < 0)).toBe(true)
  })

  it('按 strategy 和 emotion 彙總已關閉交易績效', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, symbol: 'AAPL', type: 'BUY', quantity: 10, price: 100, tradeDate: new Date('2024-01-01'), strategy: 'Breakout', emotion: 'calm' }),
      makeTx({ id: 2n, symbol: 'AAPL', type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-02-01') }),
      makeTx({ id: 3n, symbol: 'TSLA', type: 'BUY', quantity: 5, price: 200, tradeDate: new Date('2024-01-10'), strategy: 'Pullback', emotion: 'fomo' }),
      makeTx({ id: 4n, symbol: 'TSLA', type: 'SELL', quantity: 5, price: 180, tradeDate: new Date('2024-02-10') }),
    ])

    const { default: handler } = await import('~/server/api/stats/performance.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-strategy' } } as any)

    expect(result.strategyBreakdown).toEqual([
      expect.objectContaining({ name: 'Breakout', tradeCount: 1, realizedPnL: 200, winRate: 100 }),
      expect.objectContaining({ name: 'Pullback', tradeCount: 1, realizedPnL: -100, winRate: 0 }),
    ])
    expect(result.emotionBreakdown).toEqual([
      expect.objectContaining({ name: 'calm', realizedPnL: 200 }),
      expect.objectContaining({ name: 'fomo', realizedPnL: -100 }),
    ])
    expect(result.bestStrategy.name).toBe('Breakout')
    expect(result.worstStrategy.name).toBe('Pullback')
  })
})
