import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Errors } from '~/lib/errors/factory'

const mockRequireApiKey = vi.fn()
const mockStockWatchlistFindMany = vi.fn()
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
    stockWatchlist: {
      findMany: mockStockWatchlistFindMany,
    },
  },
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

describe('Agent stocks watchlist API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireApiKey.mockResolvedValue({
      apiKeyId: '31',
      label: 'Ana',
      scope: 'AGENT_WRITE',
      user: { id: '1', email: 'user@example.com', role: 'USER', name: null },
    })
  })

  it('returns watchlist for authenticated agent with WATCHING status only', async () => {
    mockStockWatchlistFindMany.mockResolvedValue([
      {
        id: 10n,
        stockId: 2n,
        status: 'WATCHING',
        sortOrder: 0,
        stock: { symbol: 'AAPL', name: 'Apple Inc.' },
      },
      {
        id: 11n,
        stockId: 3n,
        status: 'WATCHING',
        sortOrder: 1,
        stock: { symbol: 'MSFT', name: 'Microsoft Corp.' },
      },
    ])

    const { default: handler } = await import('~/server/api/agent/stocks/watchlist.get')
    const result = await handler({ context: { requestId: 'req-agent-wl' } } as any)

    expect(mockRequireApiKey).toHaveBeenCalledWith(expect.anything(), ['AGENT_WRITE'])
    expect(mockStockWatchlistFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 1n, status: 'WATCHING' },
      include: { stock: true },
      orderBy: [{ sortOrder: 'asc' }, { id: 'asc' }],
    }))
    expect(result.watchlist).toHaveLength(2)
    expect(result.watchlist[0]).toEqual({
      id: '10',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      sortOrder: 0,
      status: 'WATCHING',
    })
    expect(result.watchlist[1]).toEqual({
      id: '11',
      symbol: 'MSFT',
      name: 'Microsoft Corp.',
      sortOrder: 1,
      status: 'WATCHING',
    })
  })

  it('returns empty watchlist when no watched stocks', async () => {
    mockStockWatchlistFindMany.mockResolvedValue([])

    const { default: handler } = await import('~/server/api/agent/stocks/watchlist.get')
    const result = await handler({ context: { requestId: 'req-empty' } } as any)

    expect(result.watchlist).toEqual([])
    expect(mockStocksLogInfo).not.toHaveBeenCalled()
  })

  it('excludes ARCHIVED items from watchlist', async () => {
    mockStockWatchlistFindMany.mockResolvedValue([
      {
        id: 10n,
        stockId: 2n,
        status: 'WATCHING',
        sortOrder: 0,
        stock: { symbol: 'AAPL', name: 'Apple Inc.' },
      },
    ])

    const { default: handler } = await import('~/server/api/agent/stocks/watchlist.get')
    const result = await handler({ context: { requestId: 'req-filtered' } } as any)

    expect(mockStockWatchlistFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 1n, status: 'WATCHING' },
    }))
    expect(result.watchlist).toHaveLength(1)
  })

  it('returns stock with null name when name is not set', async () => {
    mockStockWatchlistFindMany.mockResolvedValue([
      {
        id: 10n,
        stockId: 2n,
        status: 'WATCHING',
        sortOrder: 0,
        stock: { symbol: 'AAPL', name: null },
      },
    ])

    const { default: handler } = await import('~/server/api/agent/stocks/watchlist.get')
    const result = await handler({ context: { requestId: 'req-noname' } } as any)

    expect(result.watchlist[0].name).toBeNull()
    expect(result.watchlist[0].symbol).toBe('AAPL')
  })

  it('rejects with 401 when API key is invalid', async () => {
    mockRequireApiKey.mockRejectedValue(Errors.apiKeyInvalid())

    const { default: handler } = await import('~/server/api/agent/stocks/watchlist.get')

    await expect(handler({ context: { requestId: 'req-badauth' } } as any)).rejects.toMatchObject({
      statusCode: 401,
    })
    expect(mockStockWatchlistFindMany).not.toHaveBeenCalled()
  })

  it('rejects with 403 when API key scope is insufficient', async () => {
    mockRequireApiKey.mockRejectedValue(Errors.apiKeyScopeDenied())

    const { default: handler } = await import('~/server/api/agent/stocks/watchlist.get')

    await expect(handler({ context: { requestId: 'req-badscope' } } as any)).rejects.toMatchObject({
      statusCode: 403,
    })
  })

  it('returns 500 on internal prisma error', async () => {
    mockRequireApiKey.mockResolvedValue({
      apiKeyId: '31',
      label: 'Ana',
      scope: 'AGENT_WRITE',
      user: { id: '1', email: 'user@example.com', role: 'USER', name: null },
    })
    mockStockWatchlistFindMany.mockRejectedValue(new Error('DB connection lost'))

    const { default: handler } = await import('~/server/api/agent/stocks/watchlist.get')

    await expect(handler({ context: { requestId: 'req-dberr' } } as any)).rejects.toMatchObject({
      statusCode: 500,
    })
    expect(mockStocksLogError).toHaveBeenCalledWith(
      'Failed to fetch stock watchlist via API key',
      expect.objectContaining({ error: expect.stringContaining('DB connection lost') })
    )
  })

  it('returns items sorted by sortOrder ascending', async () => {
    mockStockWatchlistFindMany.mockResolvedValue([
      { id: 30n, stockId: 4n, status: 'WATCHING', sortOrder: 0, stock: { symbol: 'TSLA', name: 'Tesla' } },
      { id: 10n, stockId: 2n, status: 'WATCHING', sortOrder: 1, stock: { symbol: 'AAPL', name: null } },
      { id: 20n, stockId: 3n, status: 'WATCHING', sortOrder: 2, stock: { symbol: 'MSFT', name: null } },
    ])

    const { default: handler } = await import('~/server/api/agent/stocks/watchlist.get')
    const result = await handler({ context: { requestId: 'req-sorted' } } as any)

    const symbols = result.watchlist.map((w: { symbol: string }) => w.symbol)
    expect(symbols).toEqual(['TSLA', 'AAPL', 'MSFT'])
    expect(result.watchlist.map((w: { sortOrder: number }) => w.sortOrder)).toEqual([0, 1, 2])
  })
})
