import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery, mockReadBody } from '../vi-setup'

const mockRequireUser = vi.fn()
const mockRequireApiKey = vi.fn()
const mockStockWatchlistFindMany = vi.fn()
const mockStockWatchlistFindFirst = vi.fn()
const mockStockWatchlistUpsert = vi.fn()
const mockStockWatchlistUpdate = vi.fn()
const mockStockUpsert = vi.fn()
const mockStockTimelineRecordFindUnique = vi.fn()
const mockStockTimelineRecordUpsert = vi.fn()
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
      findUnique: mockStockTimelineRecordFindUnique,
      upsert: mockStockTimelineRecordUpsert,
      findMany: mockStockTimelineRecordFindMany,
    },
    diary: {
      findFirst: vi.fn().mockResolvedValue(null),
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

describe('Agent → User stock timeline integration', () => {
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

  it('agent writes → user sees record in symbol timeline', async () => {
    // 1. Agent writes a record
    mockReadBody.mockResolvedValue({
      records: [
        {
          symbol: 'AAPL',
          summary: 'Agent insight about AAPL.',
          sourceType: 'ARTICLE',
          idempotencyKey: 'ana:aapl:20260501',
          occurredAt: '2026-05-01T00:00:00.000Z',
          confidence: 80,
        },
      ],
    })
    mockStockWatchlistFindMany.mockResolvedValue([
      { stockId: 2n, stock: { symbol: 'AAPL' } },
    ])
    mockStockTimelineRecordFindUnique.mockResolvedValue(null)
    mockStockTimelineRecordUpsert.mockResolvedValue({ id: 88n })

    const { default: agentHandler } = await import('~/server/api/agent/stocks/records.post')
    const agentResult = await agentHandler({ context: { requestId: 'req-agent-write' } } as any)

    expect(agentResult.created).toEqual(['88'])

    // 2. User fetches symbol timeline — should see the record
    mockStockTimelineRecordFindMany.mockResolvedValue([
      {
        id: 88n,
        userId: 1n,
        stockId: 2n,
        symbol: 'AAPL',
        summary: 'Agent insight about AAPL.',
        sourceType: 'ARTICLE',
        sourceTitle: null,
        sourceUrl: null,
        sourceDiaryId: null,
        sourceExternalId: null,
        sourceExcerpt: null,
        confidence: 80,
        idempotencyKey: 'ana:aapl:20260501',
        occurredAt: new Date('2026-05-01T00:00:00.000Z'),
        createdVia: 'API_KEY',
        createdByLabel: 'Ana',
        metadataJson: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        stock: { symbol: 'AAPL', name: 'Apple Inc.' },
      },
    ])

    const { default: userHandler } = await import('~/server/api/stocks/[symbol]/timeline.get')
    const userResult = await userHandler({
      context: {
        params: { symbol: 'AAPL' },
        requestId: 'req-user-timeline',
      },
    } as any)

    expect(userResult.records).toHaveLength(1)
    expect(userResult.records[0]).toEqual(
      expect.objectContaining({
        summary: 'Agent insight about AAPL.',
        createdByLabel: 'Ana',
      })
    )
  })

  it('agent updates same idempotencyKey → user sees updated content', async () => {
    mockReadBody.mockResolvedValue({
      records: [
        {
          symbol: 'AAPL',
          summary: 'Updated: AAPL pivoting strategy.',
          sourceType: 'ARTICLE',
          idempotencyKey: 'ana:aapl:20260501',
          occurredAt: '2026-05-01T00:00:00.000Z',
          confidence: 90,
        },
      ],
    })
    mockStockWatchlistFindMany.mockResolvedValue([
      { stockId: 2n, stock: { symbol: 'AAPL' } },
    ])
    mockStockTimelineRecordFindUnique.mockResolvedValue({ id: 88n })
    mockStockTimelineRecordUpsert.mockResolvedValue({ id: 88n })

    const { default: agentHandler } = await import('~/server/api/agent/stocks/records.post')
    const agentResult = await agentHandler({ context: { requestId: 'req-agent-update' } } as any)

    expect(agentResult.updated).toEqual(['88'])

    // User fetches — sees updated summary
    mockStockTimelineRecordFindMany.mockResolvedValue([
      {
        id: 88n,
        userId: 1n,
        stockId: 2n,
        symbol: 'AAPL',
        summary: 'Updated: AAPL pivoting strategy.',
        sourceType: 'ARTICLE',
        sourceTitle: null,
        sourceUrl: null,
        sourceDiaryId: null,
        sourceExternalId: null,
        sourceExcerpt: null,
        confidence: 90,
        idempotencyKey: 'ana:aapl:20260501',
        occurredAt: new Date('2026-05-01T00:00:00.000Z'),
        createdVia: 'API_KEY',
        createdByLabel: 'Ana',
        metadataJson: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
        stock: { symbol: 'AAPL', name: 'Apple Inc.' },
      },
    ])

    const { default: userHandler } = await import('~/server/api/stocks/[symbol]/timeline.get')
    const userResult = await userHandler({
      context: {
        params: { symbol: 'AAPL' },
        requestId: 'req-user-after-update',
      },
    } as any)

    expect(userResult.records[0].confidence).toBe(90)
  })

  it('agent writes for un-watched stock → skipped → does not appear in timeline', async () => {
    mockReadBody.mockResolvedValue({
      records: [
        {
          symbol: 'TSLA',
          summary: 'TSLA insight.',
          sourceType: 'ARTICLE',
          idempotencyKey: 'ana:tsla:20260501',
          occurredAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    })
    mockStockWatchlistFindMany.mockResolvedValue([])

    const { default: agentHandler } = await import('~/server/api/agent/stocks/records.post')
    const agentResult = await agentHandler({ context: { requestId: 'req-agent-skip' } } as any)

    expect(agentResult.skipped).toEqual([{ symbol: 'TSLA', reason: 'NOT_IN_WATCHLIST' }])
    expect(mockStockTimelineRecordUpsert).not.toHaveBeenCalled()
  })

  it('full flow: user adds watchlist → agent writes → user confirms', async () => {
    // Step 1: User adds AAPL to watchlist
    mockReadBody.mockResolvedValue({ symbol: 'AAPL' })
    mockStockUpsert.mockResolvedValue({ id: 2n, symbol: 'AAPL' })
    mockStockWatchlistFindFirst.mockResolvedValue(null)
    mockStockWatchlistUpsert.mockResolvedValue({
      id: 10n,
      stockId: 2n,
      status: 'WATCHING',
      sortOrder: 0,
      stock: { symbol: 'AAPL' },
    })

    const { default: watchlistPostHandler } = await import('~/server/api/stocks/watchlist/index.post')
    const watchlistResult = await watchlistPostHandler({ context: { requestId: 'req-wl-add' } } as any)
    expect(watchlistResult.status).toBe('WATCHING')

    // Step 2: Agent writes a record
    mockReadBody.mockResolvedValue({
      records: [
        {
          symbol: 'AAPL',
          summary: 'Agent observation.',
          sourceType: 'ARTICLE',
          idempotencyKey: 'ana:aapl:20260501',
          occurredAt: '2026-05-01T00:00:00.000Z',
        },
      ],
    })
    mockStockWatchlistFindMany.mockResolvedValue([
      { stockId: 2n, stock: { symbol: 'AAPL' } },
    ])
    mockStockTimelineRecordFindUnique.mockResolvedValue(null)
    mockStockTimelineRecordUpsert.mockResolvedValue({ id: 88n })

    const { default: agentHandler } = await import('~/server/api/agent/stocks/records.post')
    const agentResult = await agentHandler({ context: { requestId: 'req-agent-full' } } as any)
    expect(agentResult.created).toEqual(['88'])

    // Step 3: User confirms via timeline
    mockStockTimelineRecordFindMany.mockResolvedValue([
      {
        id: 88n,
        userId: 1n,
        stockId: 2n,
        symbol: 'AAPL',
        summary: 'Agent observation.',
        sourceType: 'ARTICLE',
        sourceTitle: null,
        sourceUrl: null,
        sourceDiaryId: null,
        sourceExternalId: null,
        sourceExcerpt: null,
        confidence: null,
        idempotencyKey: 'ana:aapl:20260501',
        occurredAt: new Date('2026-05-01T00:00:00.000Z'),
        createdVia: 'API_KEY',
        createdByLabel: 'Ana',
        metadataJson: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
        stock: { symbol: 'AAPL', name: 'Apple Inc.' },
      },
    ])

    const { default: userHandler } = await import('~/server/api/stocks/[symbol]/timeline.get')
    const userResult = await userHandler({
      context: {
        params: { symbol: 'AAPL' },
        requestId: 'req-confirm',
      },
    } as any)

    expect(userResult.records).toHaveLength(1)
    expect(userResult.records[0].summary).toBe('Agent observation.')
  })
})
