import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery } from '../vi-setup'

const mockRequireUser = vi.fn()
const mockStockTimelineRecordFindMany = vi.fn()
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
      findMany: mockStockTimelineRecordFindMany,
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

describe('Stocks timeline API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1', email: 'user@example.com', role: 'USER' })
    mockGetQuery.mockReturnValue({})
  })

  // --- GET /api/stocks/:symbol/timeline ---

  it('GET symbol timeline returns records', async () => {
    mockStockTimelineRecordFindMany.mockResolvedValue([
      {
        id: 10n,
        userId: 1n,
        stockId: 2n,
        symbol: 'AAPL',
        summary: 'Strong earnings report.',
        sourceType: 'DIARY',
        sourceTitle: 'Q2 Review',
        sourceUrl: null,
        sourceDiaryId: '5',
        sourceExternalId: null,
        sourceExcerpt: null,
        confidence: 85,
        idempotencyKey: 'abc-123',
        occurredAt: new Date('2026-04-30T12:00:00.000Z'),
        createdVia: 'WEB',
        createdByLabel: null,
        metadataJson: null,
        createdAt: new Date('2026-04-30T12:00:00.000Z'),
        updatedAt: new Date('2026-04-30T12:00:00.000Z'),
        stock: { symbol: 'AAPL', name: 'Apple Inc.' },
      },
    ])

    const { default: handler } = await import('~/server/api/stocks/[symbol]/timeline.get')
    const result = await handler({
      context: {
        params: { symbol: 'aapl' },
        requestId: 'req-sym-timeline',
      },
    } as any)

    expect(mockStockTimelineRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: 1n, stock: { symbol: 'AAPL' } },
        take: 100,
      })
    )
    expect(result.stock).toEqual({ symbol: 'AAPL', name: null })
    expect(result.records).toHaveLength(1)
    expect(result.records[0]).toEqual(
      expect.objectContaining({
        id: '10',
        symbol: 'AAPL',
        summary: 'Strong earnings report.',
        sourceType: 'DIARY',
      })
    )
  })

  it('GET symbol timeline respects limit parameter', async () => {
    mockGetQuery.mockReturnValue({ limit: '5' })
    mockStockTimelineRecordFindMany.mockResolvedValue([])

    const { default: handler } = await import('~/server/api/stocks/[symbol]/timeline.get')
    await handler({
      context: {
        params: { symbol: 'AAPL' },
        requestId: 'req-sym-limit',
      },
    } as any)

    expect(mockStockTimelineRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 5 })
    )
  })

  it('GET symbol timeline validates symbol is required', async () => {
    const { default: handler } = await import('~/server/api/stocks/[symbol]/timeline.get')

    await expect(
      handler({
        context: {
          params: {},
          requestId: 'req-no-symbol',
        },
      } as any)
    ).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  // --- GET /api/stocks/timeline (all) ---

  it('GET all timeline returns all user records', async () => {
    mockStockTimelineRecordFindMany.mockResolvedValue([
      {
        id: 10n,
        userId: 1n,
        stockId: 2n,
        symbol: 'AAPL',
        summary: 'First record.',
        sourceType: 'ARTICLE',
        sourceTitle: 'News',
        sourceUrl: null,
        sourceDiaryId: null,
        sourceExternalId: null,
        sourceExcerpt: null,
        confidence: 70,
        idempotencyKey: 'key-1',
        occurredAt: new Date('2026-04-30T00:00:00.000Z'),
        createdVia: 'API_KEY',
        createdByLabel: 'Ana',
        metadataJson: null,
        createdAt: new Date('2026-04-30T00:00:00.000Z'),
        updatedAt: new Date('2026-04-30T00:00:00.000Z'),
        stock: { symbol: 'AAPL', name: 'Apple Inc.' },
      },
      {
        id: 11n,
        userId: 1n,
        stockId: 3n,
        symbol: 'MSFT',
        summary: 'Second record.',
        sourceType: 'DIARY',
        sourceTitle: 'Review',
        sourceUrl: null,
        sourceDiaryId: '3',
        sourceExternalId: null,
        sourceExcerpt: null,
        confidence: 90,
        idempotencyKey: 'key-2',
        occurredAt: new Date('2026-04-29T00:00:00.000Z'),
        createdVia: 'WEB',
        createdByLabel: null,
        metadataJson: null,
        createdAt: new Date('2026-04-29T00:00:00.000Z'),
        updatedAt: new Date('2026-04-29T00:00:00.000Z'),
        stock: { symbol: 'MSFT', name: 'Microsoft Corp.' },
      },
    ])

    const { default: handler } = await import('~/server/api/stocks/timeline.get')
    const result = await handler({ context: { requestId: 'req-all-timeline' } } as any)

    expect(mockStockTimelineRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 1n } })
    )
    expect(result.records).toHaveLength(2)
    expect(result.records[0].symbol).toBe('AAPL')
    expect(result.records[1].symbol).toBe('MSFT')
    expect(result.records[0]).toEqual(
      expect.objectContaining({
        symbol: 'AAPL',
        summary: 'First record.',
        createdByLabel: 'Ana',
      })
    )
  })

  it('GET all timeline returns empty records array', async () => {
    mockStockTimelineRecordFindMany.mockResolvedValue([])

    const { default: handler } = await import('~/server/api/stocks/timeline.get')
    const result = await handler({ context: { requestId: 'req-all-empty' } } as any)

    expect(result).toEqual({ records: [] })
  })

  it('GET all timeline respects limit parameter', async () => {
    mockGetQuery.mockReturnValue({ limit: '10' })
    mockStockTimelineRecordFindMany.mockResolvedValue([])

    const { default: handler } = await import('~/server/api/stocks/timeline.get')
    await handler({ context: { requestId: 'req-all-limit' } } as any)

    expect(mockStockTimelineRecordFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    )
  })
})
