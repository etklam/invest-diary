import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks (vi.mock factories are hoisted above imports) ---
const {
  mockStockUpsert,
  mockStockWatchlistFindMany,
  mockStockWatchlistFindFirst,
  mockStockWatchlistUpsert,
  mockStockWatchlistUpdate,
  mockStockTimelineRecordGroupBy,
} = vi.hoisted(() => ({
  mockStockUpsert: vi.fn(),
  mockStockWatchlistFindMany: vi.fn(),
  mockStockWatchlistFindFirst: vi.fn(),
  mockStockWatchlistUpsert: vi.fn(),
  mockStockWatchlistUpdate: vi.fn(),
  mockStockTimelineRecordGroupBy: vi.fn(),
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

vi.mock('~/lib/stocks/symbols', () => ({
  normalizeStockSymbol: (s: string) => s.toUpperCase().replace(/\.TW$/i, '.TW').replace(/\s+/g, ' ').trim(),
}))

// --- Import after mocks ---
import {
  ensureStockBySymbol,
  upsertStockWatchlistItem,
  listUserWatchlist,
  listUserWatchlistItems,
  updateStockWatchlistItem,
} from '~/server/utils/stock-watchlist-queries'

describe('stock-watchlist-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // --- ensureStockBySymbol ---
  describe('ensureStockBySymbol', () => {
    it('normalizes symbol and calls prisma.stock.upsert', async () => {
      mockStockUpsert.mockResolvedValue({ id: 1n, symbol: 'AAPL' })
      const result = await ensureStockBySymbol('aapl')
      expect(mockStockUpsert).toHaveBeenCalledWith({
        where: { symbol: 'AAPL' },
        update: {},
        create: { symbol: 'AAPL' },
      })
      expect(result).toEqual({ id: 1n, symbol: 'AAPL' })
    })
  })

  // --- upsertStockWatchlistItem ---
  describe('upsertStockWatchlistItem', () => {
    it('creates new watchlist item with correct sortOrder', async () => {
      mockStockUpsert.mockResolvedValue({ id: 2n, symbol: 'AAPL' })
      mockStockWatchlistFindFirst.mockResolvedValue(null) // no existing items → sortOrder = 0
      mockStockWatchlistUpsert.mockResolvedValue({
        id: 10n,
        stockId: 2n,
        status: 'WATCHING',
        sortOrder: 0,
        stock: { symbol: 'AAPL', name: null },
      })

      const result = await upsertStockWatchlistItem({ userId: '1', symbol: 'AAPL' })

      expect(mockStockWatchlistFindFirst).toHaveBeenCalledWith({
        where: { userId: 1n },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      expect(mockStockWatchlistUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_stockId: { userId: 1n, stockId: 2n } },
          create: expect.objectContaining({ sortOrder: 0, status: 'WATCHING' }),
          update: { status: 'WATCHING' },
        }),
      )
      expect(result.id.toString()).toBe('10')
    })

    it('increments sortOrder from last item', async () => {
      mockStockUpsert.mockResolvedValue({ id: 2n, symbol: 'AAPL' })
      mockStockWatchlistFindFirst.mockResolvedValue({ sortOrder: 5 })
      mockStockWatchlistUpsert.mockResolvedValue({
        id: 11n,
        stockId: 2n,
        status: 'WATCHING',
        sortOrder: 6,
        stock: { symbol: 'AAPL' },
      })

      await upsertStockWatchlistItem({ userId: '1', symbol: 'AAPL' })

      expect(mockStockWatchlistUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ sortOrder: 6 }),
        }),
      )
    })

    it('converts string userId to BigInt', async () => {
      mockStockUpsert.mockResolvedValue({ id: 2n, symbol: 'AAPL' })
      mockStockWatchlistFindFirst.mockResolvedValue(null)
      mockStockWatchlistUpsert.mockResolvedValue({
        id: 10n,
        stockId: 2n,
        status: 'WATCHING',
        sortOrder: 0,
        stock: { symbol: 'AAPL' },
      })

      await upsertStockWatchlistItem({ userId: '42', symbol: 'AAPL' })

      expect(mockStockWatchlistFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 42n } }),
      )
    })
  })

  // --- listUserWatchlist ---
  describe('listUserWatchlist', () => {
    it('serializes BigInt id to string and maps fields correctly', async () => {
      mockStockWatchlistFindMany.mockResolvedValue([
        {
          id: 10n,
          stockId: 2n,
          status: 'WATCHING',
          sortOrder: 0,
          stock: { symbol: 'AAPL', name: 'Apple Inc.' },
        },
        {
          id: 20n,
          stockId: 3n,
          status: 'WATCHING',
          sortOrder: 1,
          stock: { symbol: 'MSFT', name: null },
        },
      ])

      const result = await listUserWatchlist('1')

      expect(mockStockWatchlistFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1n, status: 'WATCHING' },
          include: { stock: true },
          orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
        }),
      )
      expect(result).toEqual([
        { id: '10', symbol: 'AAPL', name: 'Apple Inc.', sortOrder: 0, status: 'WATCHING' },
        { id: '20', symbol: 'MSFT', name: null, sortOrder: 1, status: 'WATCHING' },
      ])
    })

    it('returns empty array when no items', async () => {
      mockStockWatchlistFindMany.mockResolvedValue([])
      const result = await listUserWatchlist('1')
      expect(result).toEqual([])
    })
  })

  // --- listUserWatchlistItems ---
  describe('listUserWatchlistItems', () => {
    it('serializes nested records with recordCount and latestRecord', async () => {
      const updatedAt = new Date('2026-05-01T01:00:00.000Z')
      const occurredAt = new Date('2026-05-01T00:00:00.000Z')

      mockStockWatchlistFindMany.mockResolvedValue([
        {
          id: 10n,
          stockId: 2n,
          status: 'WATCHING',
          sortOrder: 0,
          updatedAt,
          stock: {
            symbol: 'AAPL',
            name: 'Apple Inc.',
            records: [
              {
                id: 99n,
                summary: 'Earnings beat expectations.',
                occurredAt,
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

      const result = await listUserWatchlistItems('1')

      expect(result).toEqual([
        {
          id: '10',
          status: 'WATCHING',
          sortOrder: 0,
          updatedAt: updatedAt.toISOString(),
          stock: { symbol: 'AAPL', name: 'Apple Inc.' },
          recordCount: 3,
          latestRecord: {
            id: '99',
            summary: 'Earnings beat expectations.',
            occurredAt: occurredAt.toISOString(),
            sourceType: 'ARTICLE',
            sourceTitle: 'Market note',
            confidence: 80,
          },
        },
      ])
    })

    it('returns latestRecord as null when no records exist', async () => {
      mockStockWatchlistFindMany.mockResolvedValue([
        {
          id: 10n,
          stockId: 2n,
          status: 'WATCHING',
          sortOrder: 0,
          updatedAt: new Date('2026-05-01T01:00:00.000Z'),
          stock: { symbol: 'AAPL', name: 'Apple Inc.', records: [] },
        },
      ])
      mockStockTimelineRecordGroupBy.mockResolvedValue([])

      const result = await listUserWatchlistItems('1')

      expect(result[0].latestRecord).toBeNull()
      expect(result[0].recordCount).toBe(0)
    })
  })

  // --- updateStockWatchlistItem ---
  describe('updateStockWatchlistItem', () => {
    it('returns null for non-existent item', async () => {
      mockStockWatchlistFindFirst.mockResolvedValue(null)

      const result = await updateStockWatchlistItem({
        userId: '1',
        watchlistId: '999',
        status: 'ARCHIVED',
      })

      expect(result).toBeNull()
      expect(mockStockWatchlistUpdate).not.toHaveBeenCalled()
    })

    it('updates status when item exists', async () => {
      mockStockWatchlistFindFirst.mockResolvedValue({ id: 10n })
      mockStockWatchlistUpdate.mockResolvedValue({
        id: 10n,
        stockId: 2n,
        status: 'ARCHIVED',
        sortOrder: 0,
        updatedAt: new Date('2026-05-01T01:00:00.000Z'),
        stock: { symbol: 'AAPL' },
      })

      const result = await updateStockWatchlistItem({
        userId: '1',
        watchlistId: '10',
        status: 'ARCHIVED',
      })

      expect(mockStockWatchlistUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 10n },
          data: { status: 'ARCHIVED' },
        }),
      )
      expect(result).not.toBeNull()
    })

    it('updates sortOrder when provided', async () => {
      mockStockWatchlistFindFirst.mockResolvedValue({ id: 10n })
      mockStockWatchlistUpdate.mockResolvedValue({
        id: 10n,
        stockId: 2n,
        status: 'WATCHING',
        sortOrder: 99,
        updatedAt: new Date('2026-05-01T01:00:00.000Z'),
        stock: { symbol: 'AAPL' },
      })

      await updateStockWatchlistItem({
        userId: '1',
        watchlistId: '10',
        sortOrder: 99,
      })

      expect(mockStockWatchlistUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { sortOrder: 99 },
        }),
      )
    })
  })
})
