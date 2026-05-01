import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetRouterParam, mockReadBody } from '../vi-setup'

const mockRequireUser = vi.fn()
const mockStockWatchlistFindMany = vi.fn()
const mockStockWatchlistFindFirst = vi.fn()
const mockStockWatchlistUpsert = vi.fn()
const mockStockWatchlistUpdate = vi.fn()
const mockStockUpsert = vi.fn()
const mockStockTimelineRecordGroupBy = vi.fn()
const mockStocksLogInfo = vi.fn()
const mockStocksLogWarn = vi.fn()
const mockStocksLogError = vi.fn()
const mockStocksWithRequestId = vi.fn(() => ({
  info: mockStocksLogInfo,
  warn: mockStocksLogWarn,
  error: mockStocksLogError,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    stock: {
      upsert: mockStockUpsert,
    },
    stockWatchlist: {
      findMany: mockStockWatchlistFindMany,
      findFirst: mockStockWatchlistFindFirst,
      upsert: mockStockWatchlistUpsert,
      update: mockStockWatchlistUpdate,
    },
    stockTimelineRecord: {
      groupBy: mockStockTimelineRecordGroupBy,
    },
  },
}))

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    stocks: {
      withRequestId: mockStocksWithRequestId,
    },
  },
}))

describe('Stocks watchlist API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1', email: 'user@example.com', role: 'USER' })
    mockReadBody.mockResolvedValue(null)
  })

  // --- GET /api/stocks/watchlist ---

  it('GET returns WATCHING items with latestRecord', async () => {
    mockStockWatchlistFindMany.mockResolvedValue([
      {
        id: 10n,
        stockId: 2n,
        status: 'WATCHING',
        sortOrder: 0,
        updatedAt: new Date('2026-05-01T01:00:00.000Z'),
        stock: {
          symbol: 'AAPL',
          name: 'Apple Inc.',
          records: [
            {
              id: 99n,
              summary: 'Earnings beat expectations.',
              occurredAt: new Date('2026-05-01T00:00:00.000Z'),
              sourceType: 'ARTICLE',
              sourceTitle: 'Market note',
              confidence: 80,
            },
          ],
        },
      },
    ])
    mockStockTimelineRecordGroupBy.mockResolvedValue([
      { stockId: 2n, _count: { _all: 3 } },
    ])

    const { default: handler } = await import('~/server/api/stocks/watchlist/index.get')
    const result = await handler({ context: { requestId: 'req-wl-get' } } as any)

    expect(mockStockWatchlistFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 1n, status: 'WATCHING' },
      })
    )
    expect(result.items).toHaveLength(1)
    expect(result.items[0]).toEqual(
      expect.objectContaining({
        id: '10',
        stock: { symbol: 'AAPL', name: 'Apple Inc.' },
        recordCount: 3,
        latestRecord: expect.objectContaining({
          id: '99',
          summary: 'Earnings beat expectations.',
        }),
      })
    )
  })

  it('GET returns empty list when no watches', async () => {
    mockStockWatchlistFindMany.mockResolvedValue([])
    mockStockTimelineRecordGroupBy.mockResolvedValue([])

    const { default: handler } = await import('~/server/api/stocks/watchlist/index.get')
    const result = await handler({ context: { requestId: 'req-empty' } } as any)

    expect(result).toEqual({ items: [] })
  })

  // --- POST /api/stocks/watchlist ---

  it('POST creates new watchlist item', async () => {
    mockReadBody.mockResolvedValue({ symbol: 'aapl' })
    // upsertStockWatchlistItem: ensureStockBySymbol → findFirst (max sortOrder) → upsert
    mockStockUpsert.mockResolvedValue({ id: 2n, symbol: 'AAPL' })
    mockStockWatchlistFindFirst.mockResolvedValue(null) // no existing items
    mockStockWatchlistUpsert.mockResolvedValue({
      id: 10n,
      stockId: 2n,
      status: 'WATCHING',
      sortOrder: 0,
      stock: { symbol: 'AAPL' },
    })

    const { default: handler } = await import('~/server/api/stocks/watchlist/index.post')
    const result = await handler({ context: { requestId: 'req-wl-post' } } as any)

    expect(result).toEqual({
      id: '10',
      symbol: 'AAPL',
      sortOrder: 0,
      status: 'WATCHING',
    })
  })

  it('POST re-adds previously archived item (update status)', async () => {
    mockReadBody.mockResolvedValue({ symbol: 'AAPL' })
    mockStockUpsert.mockResolvedValue({ id: 2n, symbol: 'AAPL' })
    mockStockWatchlistFindFirst.mockResolvedValue({ sortOrder: 5 })
    mockStockWatchlistUpsert.mockResolvedValue({
      id: 10n,
      stockId: 2n,
      status: 'WATCHING',
      sortOrder: 6,
      stock: { symbol: 'AAPL' },
    })

    const { default: handler } = await import('~/server/api/stocks/watchlist/index.post')
    const result = await handler({ context: { requestId: 'req-wl-repost' } } as any)

    expect(result.status).toBe('WATCHING')
  })

  it('POST rejects with Zod validation error for empty symbol', async () => {
    mockReadBody.mockResolvedValue({ symbol: '' })

    const { default: handler } = await import('~/server/api/stocks/watchlist/index.post')

    await expect(
      handler({ context: { requestId: 'req-wl-bad' } } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  // --- PATCH /api/stocks/watchlist/:id ---

  it('PATCH archives a watchlist item', async () => {
    mockGetRouterParam.mockReturnValue('10')
    mockReadBody.mockResolvedValue({ status: 'ARCHIVED' })
    mockStockWatchlistFindFirst.mockResolvedValue({ id: 10n })
    mockStockWatchlistUpdate.mockResolvedValue({
      id: 10n,
      stockId: 2n,
      status: 'ARCHIVED',
      sortOrder: 0,
      updatedAt: new Date('2026-05-01T01:00:00.000Z'),
      stock: { symbol: 'AAPL' },
    })

    const { default: handler } = await import('~/server/api/stocks/watchlist/[id].patch')
    const result = await handler({ context: { requestId: 'req-wl-archive' } } as any)

    expect(mockStockWatchlistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10n },
        data: { status: 'ARCHIVED' },
      })
    )
    expect(result.status).toBe('ARCHIVED')
  })

  it('PATCH updates sortOrder', async () => {
    mockGetRouterParam.mockReturnValue('10')
    mockReadBody.mockResolvedValue({ sortOrder: 99 })
    mockStockWatchlistFindFirst.mockResolvedValue({ id: 10n })
    mockStockWatchlistUpdate.mockResolvedValue({
      id: 10n,
      stockId: 2n,
      status: 'WATCHING',
      sortOrder: 99,
      updatedAt: new Date('2026-05-01T01:00:00.000Z'),
      stock: { symbol: 'AAPL' },
    })

    const { default: handler } = await import('~/server/api/stocks/watchlist/[id].patch')
    const result = await handler({ context: { requestId: 'req-wl-sort' } } as any)

    expect(mockStockWatchlistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10n },
        data: { sortOrder: 99 },
      })
    )
    expect(result.sortOrder).toBe(99)
  })

  it('PATCH returns 404 when item not found', async () => {
    mockGetRouterParam.mockReturnValue('99')
    mockReadBody.mockResolvedValue({ status: 'ARCHIVED' })
    mockStockWatchlistFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/stocks/watchlist/[id].patch')

    await expect(
      handler({ context: { requestId: 'req-wl-404' } } as any)
    ).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('PATCH rejects when neither status nor sortOrder provided', async () => {
    mockGetRouterParam.mockReturnValue('10')
    mockReadBody.mockResolvedValue({})

    const { default: handler } = await import('~/server/api/stocks/watchlist/[id].patch')

    await expect(
      handler({ context: { requestId: 'req-wl-no-body' } } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  // --- DELETE /api/stocks/watchlist/:id ---

  it('DELETE soft-deletes (status → ARCHIVED)', async () => {
    mockGetRouterParam.mockReturnValue('10')
    mockStockWatchlistFindFirst.mockResolvedValue({ id: 10n })
    mockStockWatchlistUpdate.mockResolvedValue({
      id: 10n,
      status: 'ARCHIVED',
      stock: { symbol: 'AAPL' },
    })

    const { default: handler } = await import('~/server/api/stocks/watchlist/[id].delete')
    const result = await handler({ context: { requestId: 'req-wl-del' } } as any)

    expect(mockStockWatchlistUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 10n },
        data: { status: 'ARCHIVED' },
      })
    )
    expect(result).toEqual({ success: true })
  })

  it('DELETE returns 404 when item not found', async () => {
    mockGetRouterParam.mockReturnValue('99')
    mockStockWatchlistFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/stocks/watchlist/[id].delete')

    await expect(
      handler({ context: { requestId: 'req-wl-del-404' } } as any)
    ).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
