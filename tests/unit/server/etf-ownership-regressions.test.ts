import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetRouterParam } from '../../vi-setup'

const mockRequireUser = vi.fn()
const mockWatchlistFindFirst = vi.fn()
const mockWatchlistDelete = vi.fn()

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    etfWatchlist: {
      findFirst: mockWatchlistFindFirst,
      delete: mockWatchlistDelete,
    },
  },
}))

describe('ETF ownership regressions', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1' })
    mockGetRouterParam.mockReturnValue('42')
  })

  it('allows deleting watchlist item owned by current user (BigInt vs string id)', async () => {
    mockWatchlistFindFirst.mockResolvedValue({
      id: 42n,
      userId: 1n,
    })
    mockWatchlistDelete.mockResolvedValue({ id: 42n })

    const { default: handler } = await import('~/server/api/etf/watchlist/[id].delete')
    const result = await handler({ context: {} } as any)

    expect(result).toEqual({ success: true })
    expect(mockWatchlistFindFirst).toHaveBeenCalledWith({ where: { id: 42n, userId: 1n } })
    expect(mockWatchlistDelete).toHaveBeenCalledWith({ where: { id: 42n } })
  })

  it('returns 404 for a watchlist item owned by another user', async () => {
    mockWatchlistFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/etf/watchlist/[id].delete')
    await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 404 })
    expect(mockWatchlistDelete).not.toHaveBeenCalled()
  })
})
