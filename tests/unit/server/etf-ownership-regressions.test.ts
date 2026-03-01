import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetRouterParam } from '../../vi-setup'

const mockRequireUser = vi.fn()
const mockWatchlistFindUnique = vi.fn()
const mockWatchlistDelete = vi.fn()
const mockAlertFindUnique = vi.fn()
const mockAlertDelete = vi.fn()

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    etfWatchlist: {
      findUnique: mockWatchlistFindUnique,
      delete: mockWatchlistDelete,
    },
    etfAlert: {
      findUnique: mockAlertFindUnique,
      delete: mockAlertDelete,
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
    mockWatchlistFindUnique.mockResolvedValue({
      id: 42n,
      userId: 1n,
    })
    mockWatchlistDelete.mockResolvedValue({ id: 42n })

    const { default: handler } = await import('~/server/api/etf/watchlist/[id].delete')
    const result = await handler({ context: {} } as any)

    expect(result).toEqual({ success: true })
    expect(mockWatchlistDelete).toHaveBeenCalledWith({ where: { id: 42n } })
  })

  it('allows deleting alert owned by current user (BigInt vs string id)', async () => {
    mockAlertFindUnique.mockResolvedValue({
      id: 42n,
      userId: 1n,
    })
    mockAlertDelete.mockResolvedValue({ id: 42n })

    const { default: handler } = await import('~/server/api/etf/alerts/[id].delete')
    const result = await handler({ context: {} } as any)

    expect(result).toEqual({ success: true })
    expect(mockAlertDelete).toHaveBeenCalledWith({ where: { id: 42n } })
  })
})
