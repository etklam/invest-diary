import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks ---
const {
  mockEtfFindUnique,
  mockEtfWatchlistFindMany,
  mockEtfWatchlistFindFirst,
  mockEtfWatchlistFindUnique,
  mockEtfWatchlistCreate,
  mockEtfWatchlistDelete,
} = vi.hoisted(() => ({
  mockEtfFindUnique: vi.fn(),
  mockEtfWatchlistFindMany: vi.fn(),
  mockEtfWatchlistFindFirst: vi.fn(),
  mockEtfWatchlistFindUnique: vi.fn(),
  mockEtfWatchlistCreate: vi.fn(),
  mockEtfWatchlistDelete: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    etf: {
      findUnique: mockEtfFindUnique,
    },
    etfWatchlist: {
      findMany: mockEtfWatchlistFindMany,
      findFirst: mockEtfWatchlistFindFirst,
      findUnique: mockEtfWatchlistFindUnique,
      create: mockEtfWatchlistCreate,
      delete: mockEtfWatchlistDelete,
    },
  },
}))

// --- Import SUT after mocks ---
import {
  listUserEtfWatchlist,
  addEtfToWatchlist,
  removeEtfFromWatchlist,
} from '~/server/utils/etf-watchlist-queries'

describe('etf-watchlist-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── listUserEtfWatchlist ──────────────────────────────────────────────
  describe('listUserEtfWatchlist', () => {
    it('calls prisma.etfWatchlist.findMany with correct where, include, orderBy', async () => {
      mockEtfWatchlistFindMany.mockResolvedValue([
        {
          id: 1n,
          sortOrder: 0,
          etf: {
            symbol: 'SPY',
            name: 'SPDR S&P 500 ETF',
            prices: [
              { close: { valueOf: () => '450.50' }, date: new Date('2026-05-01') },
            ],
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

      const result = await listUserEtfWatchlist('1')

      expect(mockEtfWatchlistFindMany).toHaveBeenCalledWith({
        where: { userId: 1n },
        include: {
          etf: {
            include: {
              prices: {
                orderBy: { date: 'desc' },
                take: 1,
              },
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      })
      expect(result).toHaveLength(2)
      // Verify raw Prisma results are returned (handler does the shaping)
      expect(result[0].id).toBe(1n)
      expect(result[1].id).toBe(2n)
    })

    it('returns empty array when user has no watchlist items', async () => {
      mockEtfWatchlistFindMany.mockResolvedValue([])

      const result = await listUserEtfWatchlist('1')

      expect(result).toEqual([])
    })

    it('converts string userId to BigInt', async () => {
      mockEtfWatchlistFindMany.mockResolvedValue([])

      await listUserEtfWatchlist('42')

      expect(mockEtfWatchlistFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 42n } }),
      )
    })

    it('accepts BigInt userId directly', async () => {
      mockEtfWatchlistFindMany.mockResolvedValue([])

      await listUserEtfWatchlist(99n)

      expect(mockEtfWatchlistFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: 99n } }),
      )
    })
  })

  // ─── addEtfToWatchlist ─────────────────────────────────────────────────
  describe('addEtfToWatchlist', () => {
    it('creates watchlist item with sortOrder 0 when list is empty', async () => {
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPDR S&P 500 ETF' })
      mockEtfWatchlistFindUnique.mockResolvedValue(null) // not already in watchlist
      mockEtfWatchlistFindFirst.mockResolvedValue(null) // no existing items
      mockEtfWatchlistCreate.mockResolvedValue({
        id: 100n,
        userId: 1n,
        etfId: 10n,
        sortOrder: 0,
        etf: { symbol: 'SPY', name: 'SPDR S&P 500 ETF' },
      })

      const result = await addEtfToWatchlist('1', 'SPY')

      expect(mockEtfFindUnique).toHaveBeenCalledWith({ where: { symbol: 'SPY' } })
      expect(mockEtfWatchlistFindUnique).toHaveBeenCalledWith({
        where: {
          userId_etfId: { userId: 1n, etfId: 10n },
        },
      })
      expect(mockEtfWatchlistFindFirst).toHaveBeenCalledWith({
        where: { userId: 1n },
        orderBy: { sortOrder: 'desc' },
      })
      expect(mockEtfWatchlistCreate).toHaveBeenCalledWith({
        data: {
          userId: 1n,
          etfId: 10n,
          sortOrder: 0,
        },
        include: { etf: true },
      })
      expect(result).toEqual({ id: 100n, userId: 1n, etfId: 10n, sortOrder: 0, etf: { symbol: 'SPY', name: 'SPDR S&P 500 ETF' } })
    })

    it('calculates next sortOrder from existing items', async () => {
      mockEtfFindUnique.mockResolvedValue({ id: 20n, symbol: 'QQQ', name: 'Invesco QQQ' })
      mockEtfWatchlistFindUnique.mockResolvedValue(null)
      mockEtfWatchlistFindFirst.mockResolvedValue({ sortOrder: 3 })
      mockEtfWatchlistCreate.mockResolvedValue({
        id: 101n,
        userId: 1n,
        etfId: 20n,
        sortOrder: 4,
      })

      const result = await addEtfToWatchlist('1', 'QQQ')

      expect(mockEtfWatchlistCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ sortOrder: 4 }),
        include: { etf: true },
      })
      expect(result.sortOrder).toBe(4)
    })

    it('throws AppError when ETF does not exist', async () => {
      mockEtfFindUnique.mockResolvedValue(null)

      await expect(addEtfToWatchlist('1', 'NONEXIST'))
        .rejects.toThrow('ETF NONEXIST not found')
    })

    it('throws AppError with statusCode 404 when ETF not found', async () => {
      mockEtfFindUnique.mockResolvedValue(null)

      try {
        await addEtfToWatchlist('1', 'NONEXIST')
        expect.fail('Should have thrown')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.code).toBe('ETF_NOT_FOUND')
      }
    })

    it('throws AppError when ETF already in watchlist', async () => {
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPDR S&P 500 ETF' })
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: 1n, etfId: 10n })

      await expect(addEtfToWatchlist('1', 'SPY'))
        .rejects.toThrow('ETF SPY already in watchlist')
    })

    it('throws AppError with statusCode 409 when already in watchlist', async () => {
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPDR S&P 500 ETF' })
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: 1n, etfId: 10n })

      try {
        await addEtfToWatchlist('1', 'SPY')
        expect.fail('Should have thrown')
      } catch (error: any) {
        expect(error.statusCode).toBe(409)
        expect(error.code).toBe('ETF_ALREADY_IN_WATCHLIST')
      }
    })

    it('converts string userId to BigInt in queries', async () => {
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPY ETF' })
      mockEtfWatchlistFindUnique.mockResolvedValue(null)
      mockEtfWatchlistFindFirst.mockResolvedValue(null)
      mockEtfWatchlistCreate.mockResolvedValue({ id: 1n, sortOrder: 0 })

      await addEtfToWatchlist('42', 'SPY')

      expect(mockEtfWatchlistFindUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId_etfId: { userId: 42n, etfId: 10n } },
        }),
      )
    })

    it('normalizes symbol to uppercase', async () => {
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPY ETF' })
      mockEtfWatchlistFindUnique.mockResolvedValue(null)
      mockEtfWatchlistFindFirst.mockResolvedValue(null)
      mockEtfWatchlistCreate.mockResolvedValue({ id: 1n, sortOrder: 0 })

      await addEtfToWatchlist('1', 'spy')

      expect(mockEtfFindUnique).toHaveBeenCalledWith({ where: { symbol: 'SPY' } })
    })
  })

  // ─── removeEtfFromWatchlist ────────────────────────────────────────────
  describe('removeEtfFromWatchlist', () => {
    it('deletes watchlist item when ownership matches', async () => {
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: 1n, etfId: 10n })
      mockEtfWatchlistDelete.mockResolvedValue({ id: 100n })

      await removeEtfFromWatchlist(100n, '1')

      expect(mockEtfWatchlistFindUnique).toHaveBeenCalledWith({ where: { id: 100n } })
      expect(mockEtfWatchlistDelete).toHaveBeenCalledWith({ where: { id: 100n } })
    })

    it('throws AppError when watchlist item not found', async () => {
      mockEtfWatchlistFindUnique.mockResolvedValue(null)

      await expect(removeEtfFromWatchlist(999n, '1'))
        .rejects.toThrow('Resource not found')
    })

    it('throws AppError with statusCode 404 when not found', async () => {
      mockEtfWatchlistFindUnique.mockResolvedValue(null)

      try {
        await removeEtfFromWatchlist(999n, '1')
        expect.fail('Should have thrown')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.code).toBe('SYS_NOT_FOUND')
      }
    })

    it('throws AppError when item belongs to another user', async () => {
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: 2n, etfId: 10n })

      await expect(removeEtfFromWatchlist(100n, '1'))
        .rejects.toThrow('Forbidden')
    })

    it('throws AppError with statusCode 403 on ownership mismatch', async () => {
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: 2n, etfId: 10n })

      try {
        await removeEtfFromWatchlist(100n, '1')
        expect.fail('Should have thrown')
      } catch (error: any) {
        expect(error.statusCode).toBe(403)
        expect(error.code).toBe('AUTH_FORBIDDEN')
      }
    })

    it('accepts string userId and compares correctly with BigInt ownerId', async () => {
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: 1n, etfId: 10n })
      mockEtfWatchlistDelete.mockResolvedValue({ id: 100n })

      // Should not throw — string '1' should match BigInt 1n
      await expect(removeEtfFromWatchlist(100n, '1')).resolves.toBeUndefined()
      expect(mockEtfWatchlistDelete).toHaveBeenCalled()
    })

    it('does not call delete when ownership check fails', async () => {
      mockEtfWatchlistFindUnique.mockResolvedValue({ id: 100n, userId: 2n, etfId: 10n })

      await expect(removeEtfFromWatchlist(100n, '1')).rejects.toThrow()
      expect(mockEtfWatchlistDelete).not.toHaveBeenCalled()
    })
  })
})
