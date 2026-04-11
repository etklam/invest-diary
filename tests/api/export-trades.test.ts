import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockGetQuery } from '../vi-setup'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockTransactionFindMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    transaction: { findMany: mockTransactionFindMany },
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
    tradeDate: overrides.tradeDate ?? new Date('2026-01-15T12:00:00.000Z'),
  }
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('GET /api/stats/export-trades', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetQuery.mockReturnValue({})
    // mock H3 setHeader
    global.setHeader = vi.fn()
  })

  it('未認證 → 401', async () => {
    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/export-trades.get')
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
  })

  it('無已關閉交易 → 只有 header 行', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/export-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result).toContain('symbol,sellDate,sellQuantity')
    const lines = (result as string).trim().split('\n')
    expect(lines).toHaveLength(1) // 只有標頭
  })

  it('一筆已關閉交易 → CSV 包含正確欄位', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, symbol: 'NVDA', type: 'BUY', quantity: 5, price: 500, tradeDate: new Date('2026-01-01T12:00:00.000Z') }),
      makeTx({ id: 2n, symbol: 'NVDA', type: 'SELL', quantity: 5, price: 600, tradeDate: new Date('2026-01-15T12:00:00.000Z') }),
    ])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/export-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result).toContain('NVDA')
    expect(result).toContain('2026-01-15')
    expect(result).toContain('500') // avgCostBasis
    const lines = (result as string).trim().split('\n')
    expect(lines).toHaveLength(2) // header + 1 row
  })

  it('CSV 欄位順序正確', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTx({ id: 1n, type: 'BUY', quantity: 10, price: 100, tradeDate: new Date('2026-01-01T12:00:00.000Z') }),
      makeTx({ id: 2n, type: 'SELL', quantity: 10, price: 110, tradeDate: new Date('2026-01-10T12:00:00.000Z') }),
    ])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/export-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    const lines = (result as string).trim().split('\n')
    const header = lines[0]
    expect(header).toBe('symbol,sellDate,sellQuantity,sellPrice,avgCostBasis,realizedPnL,realizedPnLPct')
  })

  it('symbol 含特殊字元（含逗號）→ 正確轉義', async () => {
    // 理論上 symbol 不應有逗號，但測試轉義邏輯
    mockTransactionFindMany.mockResolvedValue([
      { id: 1n, symbol: 'TEST,SYM', type: 'BUY', quantity: { valueOf: () => 1 }, price: { valueOf: () => 100 }, tradeDate: new Date('2026-01-01T12:00:00.000Z') },
      { id: 2n, symbol: 'TEST,SYM', type: 'SELL', quantity: { valueOf: () => 1 }, price: { valueOf: () => 110 }, tradeDate: new Date('2026-01-10T12:00:00.000Z') },
    ])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/export-trades.get')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    // 含逗號的 symbol 應被雙引號包圍
    expect(result).toContain('"TEST,SYM"')
  })

  it('設定正確的 Content-Type 和 Content-Disposition', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    vi.resetModules()
    const { default: handler } = await import('~/server/api/stats/export-trades.get')
    await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    const setHeaderMock = global.setHeader as ReturnType<typeof vi.fn>
    const calls = setHeaderMock.mock.calls
    const contentTypCall = calls.find((c: string[]) => c[1] === 'Content-Type')
    const dispositionCall = calls.find((c: string[]) => c[1] === 'Content-Disposition')
    expect(contentTypCall).toBeTruthy()
    expect(dispositionCall).toBeTruthy()
  })
})
