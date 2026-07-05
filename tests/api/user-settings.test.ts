import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mockReadBody } from '../vi-setup'

const mockUserUpdate = vi.fn()
const mockApiLogInfo = vi.fn()
const mockApiLogWarn = vi.fn()
const mockApiLogError = vi.fn()
const mockApiLog = {
  info: mockApiLogInfo,
  warn: mockApiLogWarn,
  error: mockApiLogError,
}
const mockApiWithRequestId = vi.fn(() => mockApiLog)

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      update: mockUserUpdate,
    },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    api: {
      withRequestId: mockApiWithRequestId,
    },
  },
}))

describe('User settings API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockApiWithRequestId.mockReturnValue(mockApiLog)
  })

  it('logs successful updates through the API logger', async () => {
    mockReadBody.mockResolvedValue({
      timezone: 'Asia/Taipei',
      name: 'New Name',
    })
    mockUserUpdate.mockResolvedValue({
      name: 'New Name',
      expectedMonthlyTrades: 5,
      expectedProfit: 1200,
      expectedAvgHolding: 10,
      timezone: 'Asia/Taipei',
    })

    const { default: handler } = await import('~/server/api/user/settings.put')
    const mockEvent = {
      context: {
        user: { id: '1' },
        requestId: 'req-settings-success',
      },
    } as any

    const result = await handler(mockEvent)

    expect(result).toEqual({
      success: true,
      settings: {
        name: 'New Name',
        expectedMonthlyTrades: 5,
        expectedProfit: 1200,
        expectedAvgHolding: 10,
        timezone: 'Asia/Taipei',
      },
    })
    expect(mockApiWithRequestId).toHaveBeenCalledWith('req-settings-success')
    expect(mockApiLogInfo).toHaveBeenCalledWith(
      'User settings updated',
      expect.objectContaining({
        userId: '1',
      })
    )
  })

  it('logs validation failures as warnings', async () => {
    mockReadBody.mockResolvedValue({
      timezone: 'not-a-timezone',
    })

    const { default: handler } = await import('~/server/api/user/settings.put')
    const mockEvent = {
      context: {
        user: { id: '1' },
        requestId: 'req-settings-validation',
      },
    } as any

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 400,
    })

    expect(mockApiWithRequestId).toHaveBeenCalledWith('req-settings-validation')
    expect(mockApiLogWarn).toHaveBeenCalledWith(
      'Validation failed',
      expect.objectContaining({
        issues: expect.any(Array),
      })
    )
  })

  it('logs unexpected update failures', async () => {
    mockReadBody.mockResolvedValue({
      timezone: 'Asia/Taipei',
    })
    mockUserUpdate.mockRejectedValue(new Error('database unavailable'))

    const { default: handler } = await import('~/server/api/user/settings.put')
    const mockEvent = {
      context: {
        user: { id: '1' },
        requestId: 'req-settings-error',
      },
    } as any

    await expect(handler(mockEvent)).rejects.toMatchObject({
      statusCode: 500,
    })

    expect(mockApiWithRequestId).toHaveBeenCalledWith('req-settings-error')
    expect(mockApiLogError).toHaveBeenCalledWith(
      'Unexpected error',
      expect.objectContaining({
        error: expect.stringContaining('database unavailable'),
      })
    )
  })
})
