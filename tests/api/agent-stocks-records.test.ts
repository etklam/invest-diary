import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

const mockRequireApiKey = vi.fn()
const mockStockWatchlistFindMany = vi.fn()
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
    },
    stockTimelineRecord: {
      findUnique: mockStockTimelineRecordFindUnique,
      upsert: mockStockTimelineRecordUpsert,
    },
    diary: {
      findFirst: mockDiaryFindFirst,
    },
  },
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

describe('Agent stocks records API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireApiKey.mockResolvedValue({
      apiKeyId: '31',
      label: 'Ana',
      scope: 'AGENT_WRITE',
      user: { id: '1', email: 'user@example.com', role: 'USER', name: null },
    })
  })

  it('POST writes records for watched symbols and reports created', async () => {
    mockReadBody.mockResolvedValue({
      records: [
        {
          symbol: 'AAPL',
          summary: 'Fresh institutional buying noted.',
          sourceType: 'ARTICLE',
          idempotencyKey: 'ana:aapl:20260501',
          occurredAt: '2026-05-01T00:00:00.000Z',
          confidence: 75,
        },
      ],
    })
    mockStockWatchlistFindMany.mockResolvedValue([
      { stockId: 2n, stock: { symbol: 'AAPL' } },
    ])
    mockStockTimelineRecordFindUnique.mockResolvedValue(null)
    mockStockTimelineRecordUpsert.mockResolvedValue({ id: 88n })

    const { default: handler } = await import('~/server/api/agent/stocks/records.post')
    const result = await handler({ context: { requestId: 'req-agent-records' } } as any)

    expect(mockRequireApiKey).toHaveBeenCalledWith(expect.anything(), ['AGENT_WRITE'])
    expect(mockStockTimelineRecordUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_stockId_idempotencyKey: {
            userId: 1n,
            stockId: 2n,
            idempotencyKey: 'ana:aapl:20260501',
          },
        },
        create: expect.objectContaining({
          summary: 'Fresh institutional buying noted.',
          createdByLabel: 'Ana',
          createdVia: 'API_KEY',
        }),
      })
    )
    expect(result).toEqual({
      created: ['88'],
      updated: [],
      skipped: [],
    })
  })

  it('skips symbol not in user watchlist', async () => {
    mockReadBody.mockResolvedValue({
      records: [
        {
          symbol: 'MSFT',
          summary: 'Not watched.',
          sourceType: 'ARTICLE',
          idempotencyKey: 'ana:msft:20260501',
          occurredAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    })
    mockStockWatchlistFindMany.mockResolvedValue([])

    const { default: handler } = await import('~/server/api/agent/stocks/records.post')
    const result = await handler({ context: { requestId: 'req-skip' } } as any)

    expect(mockStockTimelineRecordUpsert).not.toHaveBeenCalled()
    expect(result).toEqual({
      created: [],
      updated: [],
      skipped: [{ symbol: 'MSFT', reason: 'NOT_IN_WATCHLIST' }],
    })
  })

  it('treats same idempotencyKey second write as update', async () => {
    mockReadBody.mockResolvedValue({
      records: [
        {
          symbol: 'AAPL',
          summary: 'Updated insight.',
          sourceType: 'ARTICLE',
          idempotencyKey: 'ana:aapl:20260501',
          occurredAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    })
    mockStockWatchlistFindMany.mockResolvedValue([
      { stockId: 2n, stock: { symbol: 'AAPL' } },
    ])
    // Return existing record so the handler treats it as update
    mockStockTimelineRecordFindUnique.mockResolvedValue({ id: 88n })
    mockStockTimelineRecordUpsert.mockResolvedValue({ id: 88n })

    const { default: handler } = await import('~/server/api/agent/stocks/records.post')
    const result = await handler({ context: { requestId: 'req-update' } } as any)

    expect(result).toEqual({
      created: [],
      updated: ['88'],
      skipped: [],
    })
  })

  it('rejects with Zod validation error on invalid body', async () => {
    mockReadBody.mockResolvedValue({
      records: [{ symbol: '', summary: '', sourceType: 'INVALID', idempotencyKey: '', occurredAt: 'bad-date' }],
    })

    const { default: handler } = await import('~/server/api/agent/stocks/records.post')

    await expect(
      handler({ context: { requestId: 'req-validation' } } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('rejects with 403 when API key scope is insufficient', async () => {
    mockRequireApiKey.mockRejectedValue(
      Object.assign(new Error('API key scope denied'), { statusCode: 403 })
    )

    const { default: handler } = await import('~/server/api/agent/stocks/records.post')

    await expect(
      handler({ context: { requestId: 'req-badscope' } } as any)
    ).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('rejects with 401 when API key is invalid', async () => {
    mockRequireApiKey.mockRejectedValue(
      Object.assign(new Error('Invalid API key'), { statusCode: 401 })
    )

    const { default: handler } = await import('~/server/api/agent/stocks/records.post')

    await expect(
      handler({ context: { requestId: 'req-badauth' } } as any)
    ).rejects.toMatchObject({
      statusCode: 401,
    })
  })
})
