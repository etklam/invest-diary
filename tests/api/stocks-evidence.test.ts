import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

const mockRequireUser = vi.fn()
const mockUpsertStockWatchlistItem = vi.fn()
const mockRecordCreate = vi.fn()
const mockRecordFindUnique = vi.fn()
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
    stockTimelineRecord: {
      create: mockRecordCreate,
      findUnique: mockRecordFindUnique,
    },
  },
}))

vi.mock('~/server/utils/stock-watchlist-queries', () => ({
  upsertStockWatchlistItem: mockUpsertStockWatchlistItem,
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

const makeEvent = () =>
  ({ context: { requestId: 'req-evidence', params: { symbol: 'aapl' } } } as any)

const makeRecord = () => ({
  id: 88n,
  userId: 1n,
  stockId: 2n,
  summary: 'Rotation into energy names accelerating.',
  sourceType: 'MARKET_ROTATION',
  sourceTitle: null,
  sourceUrl: 'https://example.com/rotation',
  sourceDiaryId: null,
  sourceExternalId: null,
  sourceExcerpt: null,
  confidence: null,
  idempotencyKey: 'web-aapl-1',
  occurredAt: new Date('2026-08-01T00:00:00.000Z'),
  createdVia: 'WEB',
  createdByLabel: null,
  metadataJson: null,
  createdAt: new Date('2026-08-02T00:00:00.000Z'),
  updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  stock: { symbol: 'AAPL' },
})

const validBody = {
  summary: 'Rotation into energy names accelerating.',
  sourceType: 'MARKET_ROTATION',
  sourceUrl: 'https://example.com/rotation',
  occurredAt: '2026-08-01T00:00:00.000Z',
  idempotencyKey: 'web-aapl-1',
}

describe('Stocks evidence API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1', email: 'user@example.com', role: 'USER', name: null })
    mockUpsertStockWatchlistItem.mockResolvedValue({ stock: { id: 2n, symbol: 'AAPL' } })
    mockRecordCreate.mockResolvedValue(makeRecord())
  })

  it('POST creates evidence for the session user and returns serialized record', async () => {
    mockReadBody.mockResolvedValue(validBody)

    const { default: handler } = await import('~/server/api/stocks/[symbol]/evidence.post')
    const result = await handler(makeEvent())

    expect(mockRequireUser).toHaveBeenCalled()
    expect(mockUpsertStockWatchlistItem).toHaveBeenCalledWith({ userId: 1n, symbol: 'AAPL' })
    expect(mockRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 1n,
          createdVia: 'WEB',
          sourceType: 'MARKET_ROTATION',
        }),
      })
    )
    expect(result).toMatchObject({
      id: '88',
      symbol: 'AAPL',
      sourceType: 'MARKET_ROTATION',
      sourceUrl: 'https://example.com/rotation',
      occurredAt: '2026-08-01T00:00:00.000Z',
      createdVia: 'WEB',
    })
  })

  it('rejects with 401 when not authenticated', async () => {
    mockRequireUser.mockImplementation(() => {
      throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
    })

    const { default: handler } = await import('~/server/api/stocks/[symbol]/evidence.post')

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 401 })
    expect(mockRecordCreate).not.toHaveBeenCalled()
  })

  it('rejects invalid sourceType with 400', async () => {
    mockReadBody.mockResolvedValue({ ...validBody, sourceType: 'INVALID' })

    const { default: handler } = await import('~/server/api/stocks/[symbol]/evidence.post')

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
    expect(mockRecordCreate).not.toHaveBeenCalled()
  })

  it('rejects non-http sourceUrl with 400', async () => {
    mockReadBody.mockResolvedValue({ ...validBody, sourceUrl: 'ftp://example.com/doc' })

    const { default: handler } = await import('~/server/api/stocks/[symbol]/evidence.post')

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
    expect(mockRecordCreate).not.toHaveBeenCalled()
  })

  it('rejects empty summary with 400', async () => {
    mockReadBody.mockResolvedValue({ ...validBody, summary: '' })

    const { default: handler } = await import('~/server/api/stocks/[symbol]/evidence.post')

    await expect(handler(makeEvent())).rejects.toMatchObject({ statusCode: 400 })
    expect(mockRecordCreate).not.toHaveBeenCalled()
  })

  it('returns the existing record on double-submit with the same idempotencyKey', async () => {
    mockReadBody.mockResolvedValue(validBody)
    mockRecordCreate.mockRejectedValue(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }))
    mockRecordFindUnique.mockResolvedValue(makeRecord())

    const { default: handler } = await import('~/server/api/stocks/[symbol]/evidence.post')
    const result = await handler(makeEvent())

    expect(result).toMatchObject({ id: '88', idempotencyKey: 'web-aapl-1' })
  })
})
