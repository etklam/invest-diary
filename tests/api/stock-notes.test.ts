import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery, mockGetRouterParam, mockReadBody } from '../vi-setup'

const mockRequireUser = vi.fn()

// Prisma mocks — Stock
const mockStockUpsert = vi.fn()
const mockStockFindUnique = vi.fn()

// Prisma mocks — StockWatchlist
const mockStockWatchlistFindFirst = vi.fn()
const mockStockWatchlistUpsert = vi.fn()

// Prisma mocks — StockNote
const mockStockNoteCreate = vi.fn()
const mockStockNoteFindMany = vi.fn()
const mockStockNoteFindFirst = vi.fn()
const mockStockNoteUpdate = vi.fn()
const mockStockNoteDelete = vi.fn()
const mockStockNoteCount = vi.fn()

// Prisma mocks — PartnerLink (used by GET with partnerId)
const mockPartnerLinkFindFirst = vi.fn()

// Logger mocks
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
      findUnique: mockStockFindUnique,
    },
    stockWatchlist: {
      findFirst: mockStockWatchlistFindFirst,
      upsert: mockStockWatchlistUpsert,
    },
    stockNote: {
      create: mockStockNoteCreate,
      findMany: mockStockNoteFindMany,
      findFirst: mockStockNoteFindFirst,
      update: mockStockNoteUpdate,
      delete: mockStockNoteDelete,
      count: mockStockNoteCount,
    },
    partnerLink: {
      findFirst: mockPartnerLinkFindFirst,
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

// Helper to build a stock note record
const makeStockNote = (overrides: Record<string, unknown> = {}) => ({
  id: 1n,
  userId: 1n,
  stockId: 2n,
  title: 'Quarterly thesis update',
  content: 'Earnings continue to grow. Maintaining overweight.',
  date: new Date('2026-05-18T00:00:00.000Z'),
  createdVia: 'USER',
  createdByLabel: null,
  createdAt: new Date('2026-05-18T12:00:00.000Z'),
  updatedAt: new Date('2026-05-18T12:00:00.000Z'),
  stock: { symbol: 'AAPL', name: 'Apple Inc.' },
  ...overrides,
})

const makeStockNoteResponse = (overrides: Record<string, unknown> = {}) => ({
  id: '1',
  symbol: 'AAPL',
  name: 'Apple Inc.',
  title: 'Quarterly thesis update',
  content: 'Earnings continue to grow. Maintaining overweight.',
  date: '2026-05-18T00:00:00.000Z',
  createdVia: 'USER',
  createdByLabel: null,
  createdAt: '2026-05-18T12:00:00.000Z',
  updatedAt: '2026-05-18T12:00:00.000Z',
  ...overrides,
})

describe('Stock Notes API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1', email: 'user@example.com', role: 'USER' })
    mockGetQuery.mockReturnValue({})
    mockReadBody.mockResolvedValue(null)
    mockStockWatchlistFindFirst.mockResolvedValue(null)
    mockStockWatchlistUpsert.mockResolvedValue({
      id: 10n,
      stockId: 2n,
      status: 'WATCHING',
      sortOrder: 0,
      stock: { id: 2n, symbol: 'AAPL', name: 'Apple Inc.' },
    })
  })

  // ─── POST /api/stocks/[symbol]/notes ────────────────────────────────

  describe('POST create note', () => {
    it('creates a new stock note and returns the response', async () => {
      mockReadBody.mockResolvedValue({
        title: 'AAPL thesis',
        content: 'Strong buy at current levels.',
        date: '2026-05-18T00:00:00.000Z',
      })

      // upsertStockWatchlistItem flow
      mockStockUpsert.mockResolvedValue({ id: 2n, symbol: 'AAPL' })
      // createStockNote
      mockStockNoteCreate.mockResolvedValue(makeStockNote({ title: 'AAPL thesis', content: 'Strong buy at current levels.' }))

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.post')
      const result = await handler({
        context: {
          params: { symbol: 'aapl' },
          requestId: 'req-notes-create',
        },
      } as any)

      expect(mockStockNoteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: 1n,
            stockId: 2n,
            title: 'AAPL thesis',
            content: 'Strong buy at current levels.',
            createdVia: 'USER',
          }),
        }),
      )
      expect(result).toEqual(makeStockNoteResponse({ title: 'AAPL thesis', content: 'Strong buy at current levels.' }))
    })

    it('rejects when title is empty', async () => {
      mockReadBody.mockResolvedValue({
        title: '',
        content: 'Some content',
      })

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.post')

      await expect(
        handler({ context: { params: { symbol: 'AAPL' }, requestId: 'req-title-empty' } } as any),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects when content is empty', async () => {
      mockReadBody.mockResolvedValue({
        title: 'Valid title',
        content: '',
      })

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.post')

      await expect(
        handler({ context: { params: { symbol: 'AAPL' }, requestId: 'req-content-empty' } } as any),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('rejects invalid stock symbol format', async () => {
      mockReadBody.mockResolvedValue({
        title: 'Test',
        content: 'Test content',
      })

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.post')

      await expect(
        handler({ context: { params: { symbol: '@@@invalid!!!' }, requestId: 'req-bad-symbol' } } as any),
      ).rejects.toMatchObject({ statusCode: 400 })
    })

    it('auto-adds stock to watchlist when not yet tracked', async () => {
      mockReadBody.mockResolvedValue({
        title: 'New stock thesis',
        content: 'First note for this stock.',
      })

      mockStockUpsert.mockResolvedValue({ id: 3n, symbol: 'NVDA' })
      mockStockWatchlistUpsert.mockResolvedValue({
        id: 11n,
        stockId: 3n,
        status: 'WATCHING',
        sortOrder: 0,
        stock: { id: 3n, symbol: 'NVDA', name: 'NVIDIA Corp.' },
      })
      mockStockNoteCreate.mockResolvedValue(makeStockNote({ id: 2n, stockId: 3n, stock: { symbol: 'NVDA', name: 'NVIDIA Corp.' } }))

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.post')
      const result = await handler({
        context: {
          params: { symbol: 'NVDA' },
          requestId: 'req-auto-watch',
        },
      } as any)

      // Should have created watchlist entry
      expect(mockStockWatchlistUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: 1n,
            stockId: 3n,
            status: 'WATCHING',
          }),
        }),
      )
      expect(result.symbol).toBe('NVDA')
    })

    it('adds a new watchlist item after existing items when creating a note', async () => {
      mockReadBody.mockResolvedValue({
        title: 'New stock thesis',
        content: 'First note for this stock.',
      })

      mockStockUpsert.mockResolvedValue({ id: 3n, symbol: 'NVDA' })
      mockStockWatchlistFindFirst.mockResolvedValue({ sortOrder: 4 })
      mockStockWatchlistUpsert.mockResolvedValue({
        id: 11n,
        stockId: 3n,
        status: 'WATCHING',
        sortOrder: 5,
        stock: { symbol: 'NVDA', name: 'NVIDIA Corp.' },
      })
      mockStockNoteCreate.mockResolvedValue(makeStockNote({
        id: 2n,
        stockId: 3n,
        stock: { symbol: 'NVDA', name: 'NVIDIA Corp.' },
      }))

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.post')
      await handler({
        context: {
          params: { symbol: 'NVDA' },
          requestId: 'req-auto-watch-sort',
        },
      } as any)

      expect(mockStockWatchlistUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: 1n,
            stockId: 3n,
            status: 'WATCHING',
            sortOrder: 5,
          }),
        }),
      )
    })

    it('restores an archived watchlist item when creating a note', async () => {
      mockReadBody.mockResolvedValue({
        title: 'Updated thesis',
        content: 'Reviewing this stock again.',
      })

      mockStockUpsert.mockResolvedValue({ id: 3n, symbol: 'NVDA' })
      mockStockWatchlistFindFirst.mockResolvedValue({ sortOrder: 4 })
      mockStockWatchlistUpsert.mockResolvedValue({
        id: 11n,
        stockId: 3n,
        status: 'WATCHING',
        sortOrder: 2,
        stock: { id: 3n, symbol: 'NVDA', name: 'NVIDIA Corp.' },
      })
      mockStockNoteCreate.mockResolvedValue(makeStockNote({
        id: 2n,
        stockId: 3n,
        stock: { symbol: 'NVDA', name: 'NVIDIA Corp.' },
      }))

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.post')
      await handler({
        context: {
          params: { symbol: 'NVDA' },
          requestId: 'req-restore-watch',
        },
      } as any)

      expect(mockStockWatchlistUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_stockId: { userId: 1n, stockId: 3n } },
          update: { status: 'WATCHING' },
        }),
      )
    })

    it('requires authentication', async () => {
      mockRequireUser.mockImplementation(() => {
        throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
      })

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.post')

      await expect(
        handler({ context: { params: { symbol: 'AAPL' }, requestId: 'req-no-auth' } } as any),
      ).rejects.toMatchObject({ statusCode: 401 })
    })

    it('supports optional date override', async () => {
      mockReadBody.mockResolvedValue({
        title: 'Past thesis',
        content: 'Looking back at Q1.',
        date: '2026-03-15T00:00:00.000Z',
      })

      mockStockUpsert.mockResolvedValue({ id: 2n, symbol: 'AAPL' })
      mockStockNoteCreate.mockResolvedValue(
        makeStockNote({ title: 'Past thesis', content: 'Looking back at Q1.', date: new Date('2026-03-15T00:00:00.000Z') }),
      )

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.post')
      await handler({ context: { params: { symbol: 'AAPL' }, requestId: 'req-date' } } as any)

      expect(mockStockNoteCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ date: new Date('2026-03-15T00:00:00.000Z') }),
        }),
      )
    })
  })

  // ─── GET /api/stocks/[symbol]/notes ─────────────────────────────────

  describe('GET list notes', () => {
    it('returns paginated notes for a symbol', async () => {
      mockStockFindUnique.mockResolvedValue({ id: 2n })
      mockStockNoteFindMany.mockResolvedValue([
        makeStockNote({ id: 1n }),
        makeStockNote({ id: 2n, title: 'Updated thesis' }),
      ])
      mockStockNoteCount.mockResolvedValue(2)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')
      const result = await handler({
        context: {
          params: { symbol: 'aapl' },
          requestId: 'req-notes-list',
        },
      } as any)

      expect(mockStockNoteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1n, stockId: 2n },
          take: 20,
          skip: 0,
        }),
      )
      expect(result.notes).toHaveLength(2)
      expect(result.total).toBe(2)
      expect(result.page).toBe(1)
      expect(result.limit).toBe(20)
      expect(result.notes[0]).toEqual(
        expect.objectContaining({
          id: '1',
          title: 'Quarterly thesis update',
          isOwnedByViewer: true,
        }),
      )
    })

    it('returns empty list when stock does not exist', async () => {
      mockStockFindUnique.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')
      const result = await handler({
        context: {
          params: { symbol: 'NONEXISTENT' },
          requestId: 'req-no-stock',
        },
      } as any)

      expect(result).toEqual({ notes: [], total: 0, page: 1, limit: 20 })
    })

    it('returns empty list when no notes exist', async () => {
      mockStockFindUnique.mockResolvedValue({ id: 2n })
      mockStockNoteFindMany.mockResolvedValue([])
      mockStockNoteCount.mockResolvedValue(0)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')
      const result = await handler({
        context: {
          params: { symbol: 'AAPL' },
          requestId: 'req-no-notes',
        },
      } as any)

      expect(result.notes).toEqual([])
      expect(result.total).toBe(0)
    })

    it('filters by createdVia=USER', async () => {
      mockGetQuery.mockReturnValue({ createdVia: 'USER' })
      mockStockFindUnique.mockResolvedValue({ id: 2n })
      mockStockNoteFindMany.mockResolvedValue([makeStockNote()])
      mockStockNoteCount.mockResolvedValue(1)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')
      await handler({
        context: {
          params: { symbol: 'AAPL' },
          requestId: 'req-filter-user',
        },
      } as any)

      expect(mockStockNoteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1n, stockId: 2n, createdVia: 'USER' },
        }),
      )
    })

    it('respects pagination parameters', async () => {
      mockGetQuery.mockReturnValue({ page: '2', limit: '5' })
      mockStockFindUnique.mockResolvedValue({ id: 2n })
      mockStockNoteFindMany.mockResolvedValue([])
      mockStockNoteCount.mockResolvedValue(0)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')
      await handler({
        context: {
          params: { symbol: 'AAPL' },
          requestId: 'req-paginated',
        },
      } as any)

      expect(mockStockNoteFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      )
    })

    it('returns 403 when partner link is missing or not accepted', async () => {
      mockGetQuery.mockReturnValue({ partnerId: '99' })

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')

      await expect(
        handler({ context: { params: { symbol: 'AAPL' }, requestId: 'req-bad-partner' } } as any),
      ).rejects.toMatchObject({ statusCode: 403 })
    })
  })

  // ─── PUT /api/stocks/[symbol]/notes/[id] ────────────────────────────

  describe('PUT update note', () => {
    it('updates a USER-created note', async () => {
      mockGetRouterParam.mockReturnValue('1')
      mockReadBody.mockResolvedValue({
        title: 'Revised thesis',
        content: 'Updated earnings analysis.',
      })
      mockStockNoteFindFirst.mockResolvedValue(makeStockNote())
      mockStockNoteUpdate.mockResolvedValue(
        makeStockNote({ title: 'Revised thesis', content: 'Updated earnings analysis.' }),
      )

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/[id].put')
      const result = await handler({
        context: {
          params: { symbol: 'AAPL', id: '1' },
          requestId: 'req-notes-update',
        },
      } as any)

      expect(mockStockNoteUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1n },
          data: expect.objectContaining({
            title: 'Revised thesis',
            content: 'Updated earnings analysis.',
          }),
        }),
      )
      expect(result.title).toBe('Revised thesis')
    })

    it('returns 404 when note not found', async () => {
      mockGetRouterParam.mockReturnValue('999')
      mockStockNoteFindFirst.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/[id].put')

      await expect(
        handler({
          context: { params: { symbol: 'AAPL', id: '999' }, requestId: 'req-update-404' },
        } as any),
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('returns 403 when trying to edit an AGENT-created note', async () => {
      mockGetRouterParam.mockReturnValue('1')
      mockReadBody.mockResolvedValue({ title: 'Hack attempt', content: '...' })
      mockStockNoteFindFirst.mockResolvedValue(
        makeStockNote({ createdVia: 'AGENT', createdByLabel: 'Ana' }),
      )

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/[id].put')

      await expect(
        handler({
          context: { params: { symbol: 'AAPL', id: '1' }, requestId: 'req-agent-edit' },
        } as any),
      ).rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects empty content in partial update', async () => {
      mockGetRouterParam.mockReturnValue('1')
      mockReadBody.mockResolvedValue({ content: '' })
      mockStockNoteFindFirst.mockResolvedValue(makeStockNote())

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/[id].put')

      await expect(
        handler({
          context: { params: { symbol: 'AAPL', id: '1' }, requestId: 'req-empty-content' },
        } as any),
      ).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  // ─── DELETE /api/stocks/[symbol]/notes/[id] ─────────────────────────

  describe('DELETE note', () => {
    it('deletes a USER-created note', async () => {
      mockGetRouterParam.mockReturnValue('1')
      mockStockNoteFindFirst.mockResolvedValue(makeStockNote())
      mockStockNoteDelete.mockResolvedValue(makeStockNote())

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/[id].delete')
      const result = await handler({
        context: {
          params: { symbol: 'AAPL', id: '1' },
          requestId: 'req-notes-delete',
        },
      } as any)

      expect(mockStockNoteDelete).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1n } }),
      )
      expect(result).toEqual({ success: true })
    })

    it('returns 404 when note not found', async () => {
      mockGetRouterParam.mockReturnValue('999')
      mockStockNoteFindFirst.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/[id].delete')

      await expect(
        handler({
          context: { params: { symbol: 'AAPL', id: '999' }, requestId: 'req-delete-404' },
        } as any),
      ).rejects.toMatchObject({ statusCode: 404 })
    })

    it('returns 403 when trying to delete an AGENT-created note', async () => {
      mockGetRouterParam.mockReturnValue('1')
      mockStockNoteFindFirst.mockResolvedValue(
        makeStockNote({ createdVia: 'AGENT', createdByLabel: 'Ana' }),
      )

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/[id].delete')

      await expect(
        handler({
          context: { params: { symbol: 'AAPL', id: '1' }, requestId: 'req-agent-delete' },
        } as any),
      ).rejects.toMatchObject({ statusCode: 403 })
    })
  })
})
