import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

const mockRequireUser = vi.fn()
const mockPriceAlertCreate = vi.fn()
const mockStocksWithRequestId = vi.fn(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    priceAlert: {
      create: mockPriceAlertCreate,
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

describe('POST /api/stocks/alerts', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: 1n })
  })

  it('rejects CHANGE_PERCENT alerts until evaluation is implemented', async () => {
    mockReadBody.mockResolvedValue({
      symbol: 'AAPL',
      type: 'CHANGE_PERCENT',
      threshold: 5,
    })
    const { default: handler } = await import('~/server/api/stocks/alerts/index.post')

    await expect(handler({ context: { requestId: 'req-alert-create' } } as any))
      .rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Validation failed',
      })
    expect(mockPriceAlertCreate).not.toHaveBeenCalled()
  })

  it('rejects MOVING_AVG alerts until evaluation is implemented', async () => {
    mockReadBody.mockResolvedValue({
      symbol: 'AAPL',
      type: 'MOVING_AVG',
      threshold: 200,
    })
    const { default: handler } = await import('~/server/api/stocks/alerts/index.post')

    await expect(handler({ context: { requestId: 'req-alert-create' } } as any))
      .rejects.toMatchObject({
        statusCode: 400,
        statusMessage: 'Validation failed',
      })
    expect(mockPriceAlertCreate).not.toHaveBeenCalled()
  })

  it('creates PRICE_ABOVE alerts', async () => {
    mockReadBody.mockResolvedValue({
      symbol: ' aapl ',
      type: 'PRICE_ABOVE',
      threshold: 200,
    })
    mockPriceAlertCreate.mockResolvedValue({
      id: 10n,
      symbol: 'AAPL',
      type: 'PRICE_ABOVE',
      threshold: '200',
      message: 'PRICE_ABOVE alert for AAPL at 200',
      isTriggered: false,
      triggeredAt: null,
      createdAt: new Date('2026-06-03T00:00:00.000Z'),
      updatedAt: new Date('2026-06-03T00:00:00.000Z'),
    })
    const { default: handler } = await import('~/server/api/stocks/alerts/index.post')

    const result = await handler({ context: { requestId: 'req-alert-create' } } as any)

    expect(mockPriceAlertCreate).toHaveBeenCalledWith({
      data: {
        userId: 1n,
        symbol: 'AAPL',
        type: 'PRICE_ABOVE',
        threshold: '200',
        message: 'PRICE_ABOVE alert for AAPL at 200',
      },
    })
    expect(result).toMatchObject({
      id: '10',
      symbol: 'AAPL',
      type: 'PRICE_ABOVE',
      threshold: '200',
      isTriggered: false,
    })
  })
})
