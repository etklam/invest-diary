import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetRouterParam } from '../../vi-setup'

const mockRequireUser = vi.fn()
const mockAdminMiddleware = vi.fn()
const mockEtfFindUnique = vi.fn()
const mockEtfPriceCreateMany = vi.fn()
const mockFetchMonthlyData = vi.fn()

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/server/middleware/admin', () => ({
  default: mockAdminMiddleware,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    etf: {
      findUnique: mockEtfFindUnique,
    },
    etfPrice: {
      createMany: mockEtfPriceCreateMany,
    },
  },
}))

vi.mock('~/lib/yahoo-finance', () => ({
  fetchMonthlyData: mockFetchMonthlyData,
}))

describe('Admin ETF initialize OHLC handling', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1' })
    mockAdminMiddleware.mockResolvedValue(undefined)
    mockGetRouterParam.mockReturnValue('7')
    mockEtfFindUnique.mockResolvedValue({ id: 7n, symbol: 'SPY' })
    mockEtfPriceCreateMany.mockResolvedValue({ count: 2 })
  })

  it('coalesces null open/high/low to close instead of writing phantom zero wicks', async () => {
    mockFetchMonthlyData.mockResolvedValue([
      {
        timestamp: 1704067200,
        open: null,
        high: null,
        low: null,
        close: 470.5,
        adjClose: null,
        volume: null,
      },
      {
        timestamp: 1706745600,
        open: 480.1,
        high: 490.2,
        low: 479.9,
        close: 485.3,
        adjClose: 485.0,
        volume: 123456,
      },
    ])

    const { default: handler } = await import('~/server/api/admin/etf/[id]/initialize.post')
    const result = await handler({ context: {}, path: '/api/admin/etf/7/initialize' } as any)

    expect(result.success).toBe(true)

    const rows = mockEtfPriceCreateMany.mock.calls[0]?.[0]?.data
    expect(rows).toHaveLength(2)

    // Incomplete bar: OHLC coalesced to the real close, never zero
    expect(rows[0]).toMatchObject({
      open: 470.5,
      high: 470.5,
      low: 470.5,
      close: 470.5,
      adjClose: 470.5,
      volume: null,
    })

    // Complete bar passes through untouched
    expect(rows[1]).toMatchObject({
      open: 480.1,
      high: 490.2,
      low: 479.9,
      close: 485.3,
      adjClose: 485.0,
      volume: 123456,
    })
  })

  it('still skips bars without a close price entirely', async () => {
    mockFetchMonthlyData.mockResolvedValue([
      { timestamp: 1704067200, open: 1, high: 2, low: 0.5, close: null, adjClose: null, volume: 1 },
      { timestamp: 1706745600, open: null, high: null, low: null, close: 485.3, adjClose: null, volume: null },
    ])

    const { default: handler } = await import('~/server/api/admin/etf/[id]/initialize.post')
    const result = await handler({ context: {}, path: '/api/admin/etf/7/initialize' } as any)

    expect(result.success).toBe(true)
    expect(mockEtfPriceCreateMany.mock.calls[0]?.[0]?.data).toHaveLength(1)
  })
})
