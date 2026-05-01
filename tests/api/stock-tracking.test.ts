import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery, mockGetRouterParam, mockReadBody } from '../vi-setup'

const mockRequireUser = vi.fn()
const mockRequireApiKey = vi.fn()
const mockStockWatchlistFindMany = vi.fn()
const mockStockWatchlistFindFirst = vi.fn()
const mockStockWatchlistUpdate = vi.fn()
const mockStockTimelineRecordGroupBy = vi.fn()
const mockStockTimelineRecordFindMany = vi.fn()
const mockStockTimelineRecordFindUnique = vi.fn()
const mockStockTimelineRecordUpsert = vi.fn()
const mockDiaryFindFirst = vi.fn()
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
    stockWatchlist: {
      findMany: mockStockWatchlistFindMany,
      findFirst: mockStockWatchlistFindFirst,
      update: mockStockWatchlistUpdate,
    },
    stockTimelineRecord: {
      groupBy: mockStockTimelineRecordGroupBy,
      findMany: mockStockTimelineRecordFindMany,
      findUnique: mockStockTimelineRecordFindUnique,
      upsert: mockStockTimelineRecordUpsert,
    },
    diary: {
      findFirst: mockDiaryFindFirst,
    },
  },
}))

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/server/utils/api-key', () => ({
  requireApiKey: mockRequireApiKey,
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    stocks: {
      withRequestId: mockStocksWithRequestId,
    },
  },
}))

describe('stock tracking API routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1', email: 'user@example.com', role: 'USER' })
    mockRequireApiKey.mockResolvedValue({
      apiKeyId: '31',
      label: 'Ana',
      scope: 'AGENT_WRITE',
      user: { id: '1', email: 'user@example.com', role: 'USER', name: null },
    })
    mockGetQuery.mockReturnValue({})
    mockReadBody.mockResolvedValue(null)
  })

  it('returns watchlist items with latest record and record count', async () => {
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
    const result = await handler({ context: { requestId: 'req-watchlist' } } as any)

    expect(mockStockWatchlistFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 1n, status: 'WATCHING' },
    }))
    expect(result.items).toEqual([
      expect.objectContaining({
        id: '10',
        stock: { symbol: 'AAPL', name: 'Apple Inc.' },
        recordCount: 3,
        latestRecord: expect.objectContaining({
          id: '99',
          summary: 'Earnings beat expectations.',
        }),
      }),
    ])
  })

  it('archives an owned watchlist item instead of deleting it', async () => {
    mockGetRouterParam.mockReturnValue('10')
    mockStockWatchlistFindFirst.mockResolvedValue({ id: 10n })
    mockStockWatchlistUpdate.mockResolvedValue({
      id: 10n,
      status: 'ARCHIVED',
      stock: { symbol: 'AAPL' },
    })

    const { default: handler } = await import('~/server/api/stocks/watchlist/[id].delete')
    const result = await handler({ context: { requestId: 'req-archive' } } as any)

    expect(mockStockWatchlistUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 10n },
      data: { status: 'ARCHIVED' },
    }))
    expect(result).toEqual({ success: true })
  })

  it('writes agent timeline records only for watched symbols and upserts idempotently', async () => {
    mockReadBody.mockResolvedValue({
      records: [
        {
          symbol: 'aapl',
          summary: 'Fresh institutional buying noted.',
          sourceType: 'ARTICLE',
          idempotencyKey: 'ana:aapl:20260501',
          occurredAt: '2026-05-01T00:00:00.000Z',
          confidence: 75,
        },
        {
          symbol: 'msft',
          summary: 'Skipped because not watched.',
          sourceType: 'ARTICLE',
          idempotencyKey: 'ana:msft:20260501',
          occurredAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    })
    mockStockWatchlistFindMany.mockResolvedValue([
      { stockId: 2n, stock: { symbol: 'AAPL' } },
    ])
    mockStockTimelineRecordFindUnique.mockResolvedValue(null)
    mockStockTimelineRecordUpsert.mockResolvedValue({ id: 88n })

    const { default: handler } = await import('~/server/api/agent/stocks/records.post')
    const result = await handler({ context: { requestId: 'req-agent-stocks' } } as any)

    expect(mockRequireApiKey).toHaveBeenCalledWith(expect.anything(), ['AGENT_WRITE'])
    expect(mockStockTimelineRecordUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId_stockId_idempotencyKey: {
          userId: 1n,
          stockId: 2n,
          idempotencyKey: 'ana:aapl:20260501',
        },
      },
      create: expect.objectContaining({
        userId: 1n,
        stockId: 2n,
        summary: 'Fresh institutional buying noted.',
        createdByLabel: 'Ana',
      }),
    }))
    expect(result).toEqual({
      created: ['88'],
      updated: [],
      skipped: [{ symbol: 'MSFT', reason: 'NOT_IN_WATCHLIST' }],
    })
  })

  it('returns stock metadata expected by the symbol timeline page', async () => {
    mockGetQuery.mockReturnValue({ limit: '20' })
    mockStockTimelineRecordFindMany.mockResolvedValue([])

    const { default: handler } = await import('~/server/api/stocks/[symbol]/timeline.get')
    const result = await handler({
      context: {
        params: { symbol: 'aapl' },
        requestId: 'req-symbol-timeline',
      },
    } as any)

    expect(mockStockTimelineRecordFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: {
        userId: 1n,
        stock: { symbol: 'AAPL' },
      },
      take: 20,
    }))
    expect(result).toEqual({
      stock: { symbol: 'AAPL', name: null },
      records: [],
    })
  })
})
