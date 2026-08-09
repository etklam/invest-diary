import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

// ── Prisma mock ──────────────────────────────────────────────────────────
const mockEtfFindUnique = vi.fn()
const mockEtfWatchlistFindUnique = vi.fn()
const mockEtfWatchlistFindFirst = vi.fn()
const mockEtfWatchlistCreate = vi.fn()
const mockEtfWatchlistFindMany = vi.fn()
const mockEtfWatchlistDelete = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    etf: {
      findUnique: mockEtfFindUnique,
    },
    etfWatchlist: {
      findUnique: mockEtfWatchlistFindUnique,
      findFirst: mockEtfWatchlistFindFirst,
      create: mockEtfWatchlistCreate,
      findMany: mockEtfWatchlistFindMany,
      delete: mockEtfWatchlistDelete,
    },
  },
}))

// ── Auth mock ────────────────────────────────────────────────────────────
const mockRequireUser = vi.fn()
vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

// ── Validation mock ──────────────────────────────────────────────────────
const mockParsePositiveBigIntParam = vi.fn()
vi.mock('~/server/utils/validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/validation')>()
  return {
    ...actual,
    parsePositiveBigIntParam: mockParsePositiveBigIntParam,
  }
})

// ── Logger mock ──────────────────────────────────────────────────────────
const mockEtfLog = { info: vi.fn(), error: vi.fn(), warn: vi.fn() }
vi.mock('~/lib/logger', () => ({
  logger: {
    etf: { withRequestId: vi.fn(() => mockEtfLog) },
  },
}))

// ── Tests ────────────────────────────────────────────────────────────────
describe('ETF watchlist routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1' })
    mockReadBody.mockReset()
  })

  // ── GET /api/etf/watchlist ───────────────────────────────────────────
  describe('GET /api/etf/watchlist', () => {
    it('returns watchlist ordered by sortOrder ascending', async () => {
      mockEtfWatchlistFindMany.mockResolvedValue([
        {
          id: 1n,
          sortOrder: 0,
          etf: {
            symbol: 'SPY',
            name: 'SPDR S&P 500 ETF',
            prices: [{ close: { valueOf: () => '450.50' }, date: new Date('2026-05-01') }],
          },
        },
        {
          id: 2n,
          sortOrder: 1,
          etf: {
            symbol: 'QQQ',
            name: 'Invesco QQQ',
            prices: [],
          },
        },
      ])

      const { default: handler } = await import('~/server/api/etf/watchlist/index.get')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

      expect(mockEtfWatchlistFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 1n },
        orderBy: { sortOrder: 'asc' },
        include: expect.objectContaining({
          etf: expect.objectContaining({
            include: expect.objectContaining({
              prices: expect.objectContaining({ take: 1 }),
            }),
          }),
        }),
      }))
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: '1',
        symbol: 'SPY',
        sortOrder: 0,
        latestPrice: 450.50,
      })
      expect(result[0].latestDate).toBeDefined()
      expect(result[1]).toMatchObject({
        id: '2',
        symbol: 'QQQ',
        sortOrder: 1,
        latestPrice: null,
        latestDate: null,
      })
    })

    it('returns empty array when watchlist is empty', async () => {
      mockEtfWatchlistFindMany.mockResolvedValue([])

      const { default: handler } = await import('~/server/api/etf/watchlist/index.get')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-2' } } as any)

      expect(result).toEqual([])
    })

    it('rejects unauthenticated access with 401', async () => {
      mockRequireUser.mockImplementation(() => {
        throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
      })
      const { default: handler } = await import('~/server/api/etf/watchlist/index.get')
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })
  })

  // ── POST /api/etf/watchlist ──────────────────────────────────────────
  describe('POST /api/etf/watchlist', () => {
    it('adds ETF to watchlist with sortOrder 0 when empty', async () => {
      mockReadBody.mockResolvedValue({ symbol: 'SPY' })
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPDR S&P 500 ETF' })
      mockEtfWatchlistFindUnique.mockResolvedValue(null) // not already in watchlist
      mockEtfWatchlistFindFirst.mockResolvedValue(null) // no existing items
      mockEtfWatchlistCreate.mockResolvedValue({
        id: 100n,
        sortOrder: 0,
        etf: { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
      })

      const { default: handler } = await import('~/server/api/etf/watchlist/index.post')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

      expect(mockEtfFindUnique).toHaveBeenCalledWith({ where: { symbol: 'SPY' } })
      expect(mockEtfWatchlistCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: 1n,
          etfId: 10n,
          sortOrder: 0,
        }),
        include: { etf: true },
      }))
      expect(result).toMatchObject({
        id: '100',
        symbol: 'SPY',
        name: 'SPDR S&P 500 ETF',
        sortOrder: 0,
      })
    })

    it('assigns correct sortOrder after existing items', async () => {
      mockReadBody.mockResolvedValue({ symbol: 'QQQ' })
      mockEtfFindUnique.mockResolvedValue({ id: 20n, symbol: 'QQQ', name: 'Invesco QQQ' })
      mockEtfWatchlistFindUnique.mockResolvedValue(null)
      mockEtfWatchlistFindFirst.mockResolvedValue({ sortOrder: 3 })
      mockEtfWatchlistCreate.mockResolvedValue({
        id: 101n,
        sortOrder: 4,
        etf: { symbol: 'QQQ', name: 'Invesco QQQ' },
      })

      const { default: handler } = await import('~/server/api/etf/watchlist/index.post')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-2' } } as any)

      expect(mockEtfWatchlistFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 1n },
        orderBy: { sortOrder: 'desc' },
      }))
      expect(mockEtfWatchlistCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 4 }),
      }))
      expect(result.sortOrder).toBe(4)
    })

    it('normalizes symbol to uppercase and trims whitespace', async () => {
      mockReadBody.mockResolvedValue({ symbol: '  spy  ' })
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPDR S&P 500 ETF' })
      mockEtfWatchlistFindUnique.mockResolvedValue(null)
      mockEtfWatchlistFindFirst.mockResolvedValue(null)
      mockEtfWatchlistCreate.mockResolvedValue({ id: 102n, sortOrder: 0, etf: { symbol: 'SPY', name: 'SPDR S&P 500 ETF' } })

      const { default: handler } = await import('~/server/api/etf/watchlist/index.post')
      await handler({ context: { user: { id: '1' }, requestId: 'req-3' } } as any)

      expect(mockEtfFindUnique).toHaveBeenCalledWith({ where: { symbol: 'SPY' } })
    })

    it('returns 400 when symbol is missing', async () => {
      mockReadBody.mockResolvedValue({})

      const { default: handler } = await import('~/server/api/etf/watchlist/index.post')
      // Validation error via Errors.validationError().toH3Error() -> 400
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-4' } } as any))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('returns 400 when symbol is not a string', async () => {
      mockReadBody.mockResolvedValue({ symbol: 12345 })

      const { default: handler } = await import('~/server/api/etf/watchlist/index.post')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-5' } } as any))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('returns 404 when ETF does not exist', async () => {
      mockReadBody.mockResolvedValue({ symbol: 'NONEXIST' })
      mockEtfFindUnique.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/etf/watchlist/index.post')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-6' } } as any))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('returns 409 when ETF already in watchlist', async () => {
      mockReadBody.mockResolvedValue({ symbol: 'SPY' })
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPDR S&P 500 ETF' })
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: '1', etfId: 10n })

      const { default: handler } = await import('~/server/api/etf/watchlist/index.post')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-7' } } as any))
        .rejects.toMatchObject({ statusCode: 409 })
    })

    it('rejects unauthenticated access with 401', async () => {
      mockRequireUser.mockImplementation(() => {
        throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
      })
      const { default: handler } = await import('~/server/api/etf/watchlist/index.post')
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })
  })

  // ── DELETE /api/etf/watchlist/:id ────────────────────────────────────
  describe('DELETE /api/etf/watchlist/:id', () => {
    it('deletes watchlist item owned by the authenticated user', async () => {
      mockParsePositiveBigIntParam.mockReturnValue(100n)
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: 1n })
      mockEtfWatchlistDelete.mockResolvedValue({ id: 100n })

      const { default: handler } = await import('~/server/api/etf/watchlist/[id].delete')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

      expect(mockParsePositiveBigIntParam).toHaveBeenCalledWith(expect.any(Object), 'id')
      expect(mockEtfWatchlistDelete).toHaveBeenCalledWith({ where: { id: 100n } })
      expect(result).toEqual({ success: true })
    })

    it('returns 404 when watchlist item does not exist', async () => {
      mockParsePositiveBigIntParam.mockReturnValue(999n)
      mockEtfWatchlistFindUnique.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/etf/watchlist/[id].delete')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-2' } } as any))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('returns 403 when watchlist item belongs to another user', async () => {
      mockParsePositiveBigIntParam.mockReturnValue(100n)
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: 2n })

      const { default: handler } = await import('~/server/api/etf/watchlist/[id].delete')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-3' } } as any))
        .rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects unauthenticated access with 401', async () => {
      mockRequireUser.mockImplementation(() => {
        throw Object.assign(new Error('Authentication required'), { statusCode: 401 })
      })
      const { default: handler } = await import('~/server/api/etf/watchlist/[id].delete')
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })
  })
})
