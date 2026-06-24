import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../../vi-setup'
import { ErrorCodes } from '~/lib/errors/codes'

const mockRequireUser = vi.fn()
const mockTransactionFindMany = vi.fn()
const mockCalculateHoldings = vi.fn()
const mockStocksWithRequestId = vi.fn()
const mockStocksLogError = vi.fn()

describe('Phase 2 auth and error contracts', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    mockReadBody.mockReset()
  })

  it('requireUser throws the shared auth error contract', async () => {
    const { requireUser } = await import('~/server/utils/auth')

    try {
      requireUser({ context: {} } as any)
      throw new Error('Expected requireUser to throw')
    } catch (error: any) {
      expect(error).toMatchObject({
        statusCode: 401,
        statusMessage: 'Authentication required',
        data: {
          code: ErrorCodes.AUTH_UNAUTHORIZED,
        },
      })
    }
  })

  it('diary by-date endpoint returns shared unauthorized errors', async () => {
    const { default: handler } = await import('~/server/api/diaries/by-date.get')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 401,
      data: {
        code: ErrorCodes.AUTH_UNAUTHORIZED,
      },
    })
  })

  it('etf watchlist validation uses the shared machine-readable error shape', async () => {
    mockRequireUser.mockReturnValue({ id: '1' })
    mockReadBody.mockResolvedValue({ symbol: '' })
    vi.doMock('~/server/utils/auth', async (importOriginal) => {
      const actual = await importOriginal<typeof import('~/server/utils/auth')>()
      return {
        ...actual,
        requireUser: mockRequireUser,
      }
    })

    const { default: handler } = await import('~/server/api/etf/watchlist/index.post')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 400,
      data: {
        code: ErrorCodes.SYS_VALIDATION_ERROR,
        details: [
          {
            field: 'symbol',
            message: 'Symbol is required',
          },
        ],
      },
    })
  })

  it('stocks holdings logs through the shared logger and throws internal error codes', async () => {
    mockStocksWithRequestId.mockReturnValue({
      error: mockStocksLogError,
      debug: vi.fn(),
    })
    mockTransactionFindMany.mockRejectedValueOnce(new Error('DB down'))
    vi.doMock('~/lib/prisma', () => ({
      default: {
        transaction: {
          findMany: mockTransactionFindMany,
        },
      },
    }))
    vi.doMock('~/lib/position-state', () => ({
      calculateHoldings: mockCalculateHoldings,
    }))
    vi.doMock('~/lib/logger', () => ({
      logger: {
        stocks: {
          withRequestId: mockStocksWithRequestId,
        },
      },
    }))

    const { default: handler } = await import('~/server/api/stocks/holdings.get')

    await expect(handler({
      context: {
        user: { id: '1' },
        requestId: 'req-42',
      },
    } as any)).rejects.toMatchObject({
      statusCode: 500,
      data: {
        code: ErrorCodes.SYS_INTERNAL_ERROR,
      },
    })

    expect(mockStocksWithRequestId).toHaveBeenCalledWith('req-42')
    expect(mockStocksLogError).toHaveBeenCalled()
  })
})
