import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks (vi.mock factories are hoisted above imports) ---
const {
  mockStockUpsert,
  mockStockWatchlistFindMany,
  mockStockTimelineRecordFindMany,
  mockStockTimelineRecordFindUnique,
  mockStockTimelineRecordUpsert,
  mockDiaryFindFirst,
} = vi.hoisted(() => ({
  mockStockUpsert: vi.fn(),
  mockStockWatchlistFindMany: vi.fn(),
  mockStockTimelineRecordFindMany: vi.fn(),
  mockStockTimelineRecordFindUnique: vi.fn(),
  mockStockTimelineRecordUpsert: vi.fn(),
  mockDiaryFindFirst: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    stock: {
      upsert: mockStockUpsert,
    },
    stockWatchlist: {
      findMany: mockStockWatchlistFindMany,
    },
    stockTimelineRecord: {
      findMany: mockStockTimelineRecordFindMany,
      findUnique: mockStockTimelineRecordFindUnique,
      upsert: mockStockTimelineRecordUpsert,
    },
    diary: {
      findFirst: mockDiaryFindFirst,
    },
  },
}))

vi.mock('~/lib/stocks/symbols', () => ({
  normalizeStockSymbol: (s: string) => s.toUpperCase().replace(/\.TW$/i, '.TW').replace(/\s+/g, ' ').trim(),
}))

// --- Import after mocks ---
import {
  listUserTimeline,
  listUserTimelineBySymbol,
  toTimelineResponseItem,
  createStockTimelineRecordsFromAgent,
} from '~/server/utils/stock-timeline-queries'

describe('stock-timeline-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- listUserTimeline ---
  describe('listUserTimeline', () => {
    it('converts userId to BigInt and applies limit', async () => {
      mockStockTimelineRecordFindMany.mockResolvedValue([])

      await listUserTimeline('42', 50)

      expect(mockStockTimelineRecordFindMany).toHaveBeenCalledWith({
        where: { userId: 42n },
        include: { stock: true },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 50,
      })
    })

    it('defaults limit to 100 when not specified', async () => {
      mockStockTimelineRecordFindMany.mockResolvedValue([])

      await listUserTimeline('1')

      expect(mockStockTimelineRecordFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 }),
      )
    })

    it('converts bigint userId input', async () => {
      mockStockTimelineRecordFindMany.mockResolvedValue([])

      await listUserTimeline(1n)

      expect(mockStockTimelineRecordFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 1n } }),
      )
    })
  })

  // --- listUserTimelineBySymbol ---
  describe('listUserTimelineBySymbol', () => {
    it('normalizes symbol and queries with stock relation', async () => {
      mockStockTimelineRecordFindMany.mockResolvedValue([])

      await listUserTimelineBySymbol('1', 'aapl', 25)

      expect(mockStockTimelineRecordFindMany).toHaveBeenCalledWith({
        where: {
          userId: 1n,
          stock: { symbol: 'AAPL' },
        },
        include: { stock: true },
        orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
        take: 25,
      })
    })
  })

  // --- toTimelineResponseItem ---
  describe('toTimelineResponseItem', () => {
    it('serializes all fields including BigInt and dates', () => {
      const input = {
        id: 88n,
        stock: { symbol: 'AAPL' },
        summary: 'Test summary',
        sourceType: 'ARTICLE' as const,
        sourceTitle: 'Market note',
        sourceUrl: 'https://example.com',
        sourceDiaryId: 100n,
        sourceExternalId: 'ext-123',
        sourceExcerpt: 'Some excerpt',
        confidence: 85,
        idempotencyKey: 'ana:aapl:20260501',
        occurredAt: new Date('2026-05-01T00:00:00.000Z'),
        createdVia: 'API_KEY' as const,
        createdByLabel: 'Ana',
        metadataJson: '{"key":"value"}',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      }

      const result = toTimelineResponseItem(input)

      expect(result).toEqual({
        id: '88',
        symbol: 'AAPL',
        summary: 'Test summary',
        sourceType: 'ARTICLE',
        sourceTitle: 'Market note',
        sourceUrl: 'https://example.com',
        sourceDiaryId: '100',
        sourceExternalId: 'ext-123',
        sourceExcerpt: 'Some excerpt',
        confidence: 85,
        idempotencyKey: 'ana:aapl:20260501',
        occurredAt: '2026-05-01T00:00:00.000Z',
        createdVia: 'API_KEY',
        createdByLabel: 'Ana',
        metadataJson: '{"key":"value"}',
        createdAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-05-01T10:00:00.000Z',
      })
    })

    it('handles null optional fields', () => {
      const input = {
        id: 1n,
        stock: { symbol: 'TSLA' },
        summary: 'Brief note',
        sourceType: 'MANUAL' as const,
        sourceTitle: null,
        sourceUrl: null,
        sourceDiaryId: null,
        sourceExternalId: null,
        sourceExcerpt: null,
        confidence: null,
        idempotencyKey: 'key-1',
        occurredAt: new Date('2026-05-01T00:00:00.000Z'),
        createdVia: 'WEB' as const,
        createdByLabel: null,
        metadataJson: null,
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
        updatedAt: new Date('2026-05-01T00:00:00.000Z'),
      }

      const result = toTimelineResponseItem(input)

      expect(result.sourceDiaryId).toBeNull()
      expect(result.sourceTitle).toBeNull()
      expect(result.confidence).toBeNull()
      expect(result.createdByLabel).toBeNull()
    })
  })

  // --- createStockTimelineRecordsFromAgent ---
  describe('createStockTimelineRecordsFromAgent', () => {
    it('skips symbols not in watchlist', async () => {
      mockStockWatchlistFindMany.mockResolvedValue([])
      mockStockTimelineRecordFindUnique.mockResolvedValue(null)
      mockStockTimelineRecordUpsert.mockResolvedValue({ id: 1n })

      const result = await createStockTimelineRecordsFromAgent({
        userId: '1',
        records: [
          {
            symbol: 'TSLA',
            summary: 'Not watching this',
            sourceType: 'ARTICLE',
            idempotencyKey: 'tsla:1',
            occurredAt: '2026-05-01T00:00:00.000Z',
          },
        ],
      })

      expect(result.skipped).toEqual([{ symbol: 'TSLA', reason: 'NOT_IN_WATCHLIST' }])
      expect(result.created).toEqual([])
      expect(result.updated).toEqual([])
      expect(mockStockTimelineRecordUpsert).not.toHaveBeenCalled()
    })

    it('validates diary ownership when sourceDiaryId provided', async () => {
      mockStockWatchlistFindMany.mockResolvedValue([
        { stockId: 2n, stock: { symbol: 'AAPL' } },
      ])
      mockDiaryFindFirst.mockResolvedValue(null) // diary not owned by user
      mockStockTimelineRecordFindUnique.mockResolvedValue(null)
      mockStockTimelineRecordUpsert.mockResolvedValue({ id: 1n })

      const result = await createStockTimelineRecordsFromAgent({
        userId: '1',
        records: [
          {
            symbol: 'AAPL',
            summary: 'With diary ref',
            sourceType: 'DIARY',
            idempotencyKey: 'aapl:diary',
            occurredAt: '2026-05-01T00:00:00.000Z',
            sourceDiaryId: '999',
          },
        ],
      })

      expect(result.skipped).toEqual([{ symbol: 'AAPL', reason: 'SOURCE_DIARY_NOT_OWNED' }])
      expect(mockStockTimelineRecordUpsert).not.toHaveBeenCalled()
    })

    it('creates new record when no existing with same idempotencyKey', async () => {
      mockStockWatchlistFindMany.mockResolvedValue([
        { stockId: 2n, stock: { symbol: 'AAPL' } },
      ])
      mockStockTimelineRecordFindUnique.mockResolvedValue(null) // no existing record
      mockStockTimelineRecordUpsert.mockResolvedValue({ id: 88n })

      const result = await createStockTimelineRecordsFromAgent({
        userId: '1',
        createdByLabel: 'Ana',
        records: [
          {
            symbol: 'AAPL',
            summary: 'New insight',
            sourceType: 'ARTICLE',
            idempotencyKey: 'ana:aapl:20260501',
            occurredAt: '2026-05-01T00:00:00.000Z',
          },
        ],
      })

      expect(result.created).toEqual(['88'])
      expect(result.updated).toEqual([])
    })

    it('updates existing record with same idempotencyKey', async () => {
      mockStockWatchlistFindMany.mockResolvedValue([
        { stockId: 2n, stock: { symbol: 'AAPL' } },
      ])
      mockStockTimelineRecordFindUnique.mockResolvedValue({ id: 88n }) // existing
      mockStockTimelineRecordUpsert.mockResolvedValue({ id: 88n })

      const result = await createStockTimelineRecordsFromAgent({
        userId: '1',
        records: [
          {
            symbol: 'AAPL',
            summary: 'Updated insight',
            sourceType: 'ARTICLE',
            idempotencyKey: 'ana:aapl:20260501',
            occurredAt: '2026-05-01T00:00:00.000Z',
          },
        ],
      })

      expect(result.updated).toEqual(['88'])
      expect(result.created).toEqual([])
    })

    it('processes multiple records with mixed results', async () => {
      mockStockWatchlistFindMany.mockResolvedValue([
        { stockId: 2n, stock: { symbol: 'AAPL' } },
      ])
      mockStockTimelineRecordFindUnique.mockResolvedValue(null)
      mockStockTimelineRecordUpsert.mockResolvedValue({ id: 90n })

      const result = await createStockTimelineRecordsFromAgent({
        userId: '1',
        records: [
          {
            symbol: 'AAPL',
            summary: 'Record 1',
            sourceType: 'ARTICLE',
            idempotencyKey: 'aapl:1',
            occurredAt: '2026-05-01T00:00:00.000Z',
          },
          {
            symbol: 'TSLA', // not in watchlist
            summary: 'Record 2',
            sourceType: 'ARTICLE',
            idempotencyKey: 'tsla:1',
            occurredAt: '2026-05-01T00:00:00.000Z',
          },
        ],
      })

      expect(result.created).toEqual(['90'])
      expect(result.skipped).toEqual([{ symbol: 'TSLA', reason: 'NOT_IN_WATCHLIST' }])
    })

    it('passes all optional fields to upsert create', async () => {
      mockStockWatchlistFindMany.mockResolvedValue([
        { stockId: 2n, stock: { symbol: 'AAPL' } },
      ])
      mockDiaryFindFirst.mockResolvedValue({ id: 50n }) // owned diary
      mockStockTimelineRecordFindUnique.mockResolvedValue(null)
      mockStockTimelineRecordUpsert.mockResolvedValue({ id: 99n })

      await createStockTimelineRecordsFromAgent({
        userId: '1',
        createdByLabel: 'Bot',
        records: [
          {
            symbol: 'AAPL',
            summary: 'Full record',
            sourceType: 'DIARY',
            idempotencyKey: 'full:1',
            occurredAt: '2026-05-01T00:00:00.000Z',
            sourceTitle: 'My diary',
            sourceUrl: 'https://example.com',
            sourceDiaryId: '50',
            sourceExternalId: 'ext-1',
            sourceExcerpt: 'An excerpt',
            confidence: 90,
            metadataJson: '{"tags":["tech"]}',
          },
        ],
      })

      const createArg = mockStockTimelineRecordUpsert.mock.calls[0][0].create
      expect(createArg).toEqual(
        expect.objectContaining({
          userId: 1n,
          stockId: 2n,
          summary: 'Full record',
          sourceType: 'DIARY',
          sourceTitle: 'My diary',
          sourceUrl: 'https://example.com',
          sourceDiaryId: 50n,
          sourceExternalId: 'ext-1',
          sourceExcerpt: 'An excerpt',
          confidence: 90,
          idempotencyKey: 'full:1',
          occurredAt: new Date('2026-05-01T00:00:00.000Z'),
          createdVia: 'API_KEY',
          createdByLabel: 'Bot',
          metadataJson: '{"tags":["tech"]}',
        }),
      )
    })
  })
})
