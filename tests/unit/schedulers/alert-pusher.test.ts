import { describe, it, expect, beforeEach, vi } from 'vitest'
import { createAlertPusher } from '~/server/schedulers/alert-pusher'

describe('createAlertPusher', () => {
  const mockFindMany = vi.fn()
  const mockEmitToUser = vi.fn()
  const mockLoggerInfo = vi.fn()
  const mockLoggerError = vi.fn()

  const createDeps = () => ({
    prisma: {
      alert: {
        findMany: mockFindMany,
      },
    },
    broadcaster: {
      emitToUser: mockEmitToUser,
    },
    logger: {
      info: mockLoggerInfo,
      error: mockLoggerError,
    },
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should start pushing alerts immediately on start()', async () => {
    const now = new Date('2026-03-13T00:00:00.000Z')
    vi.setSystemTime(now)

    mockFindMany.mockResolvedValueOnce([
      {
        id: 1n,
        message: 'Test alert',
        triggerAt: new Date(now.getTime() + 1000),
        diary: {
          id: 10n,
          title: 'Morning entry',
          userId: 5n,
        },
      },
    ])
    mockEmitToUser.mockReturnValue(true)

    const pusher = createAlertPusher(createDeps())
    pusher.start()

    // 啟動時立即執行一次（async，用 microtask 等待）
    await vi.runAllTicks()

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          isDismissed: false,
          triggerAt: {
            gte: now,
            lt: new Date(now.getTime() + 60000 + 5000),
          },
        },
      })
    )
    expect(mockEmitToUser).toHaveBeenCalledWith(
      '5',
      'alert:triggered',
      expect.objectContaining({
        id: '1',
        message: 'Test alert',
        triggerAt: new Date(now.getTime() + 1000).toISOString(),
        diary: {
          id: '10',
          title: 'Morning entry',
        },
      })
    )
  })

  it('should let the broadcaster report offline users', async () => {
    const now = new Date('2026-03-13T00:00:00.000Z')
    vi.setSystemTime(now)

    mockFindMany.mockResolvedValueOnce([
      {
        id: 2n,
        message: 'Offline alert',
        triggerAt: new Date(now.getTime() + 30000),
        diary: {
          id: 20n,
          title: 'Evening entry',
          userId: 7n,
        },
      },
    ])
    mockEmitToUser.mockReturnValue(false)

    const pusher = createAlertPusher(createDeps())
    pusher.start()

    await vi.runAllTicks()

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockEmitToUser).toHaveBeenCalledWith(
      '7',
      'alert:triggered',
      expect.objectContaining({
        id: '2',
      })
    )
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.stringContaining('User 7 is offline')
    )
  })

  it('should handle empty alert results gracefully', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const pusher = createAlertPusher(createDeps())
    pusher.start()

    await vi.runAllTicks()

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockEmitToUser).not.toHaveBeenCalled()
  })

  it('should continue processing other alerts when one fails', async () => {
    const now = new Date('2026-03-13T00:00:00.000Z')
    vi.setSystemTime(now)

    mockFindMany.mockResolvedValueOnce([
      {
        id: 1n,
        message: 'Good alert',
        triggerAt: new Date(now.getTime() + 1000),
        diary: { id: 10n, title: 'Entry 1', userId: 1n },
      },
      {
        id: 2n,
        message: 'Bad alert',
        triggerAt: new Date(now.getTime() + 2000),
        diary: { id: 20n, title: 'Entry 2', userId: 2n },
      },
    ])

    // First user connected and succeeds, second throws
    mockEmitToUser.mockReturnValueOnce(true).mockImplementationOnce(() => {
      throw new Error('Emit failed')
    })

    const pusher = createAlertPusher(createDeps())
    pusher.start()

    await vi.runAllTicks()

    // Both alerts should have been attempted
    expect(mockEmitToUser).toHaveBeenCalledTimes(2)
    // Error for the second alert should be logged
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to push alert 2'),
      expect.any(Error)
    )
  })

  it('should handle findMany errors gracefully', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('DB error'))

    const pusher = createAlertPusher(createDeps())
    pusher.start()

    await vi.runAllTicks()

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Error checking alerts'),
      expect.any(Error)
    )
  })

  it('should stop the interval when stop() is called', () => {
    mockFindMany.mockResolvedValue([])

    const pusher = createAlertPusher(createDeps())
    pusher.start()

    // Clear mock from initial call
    vi.clearAllMocks()

    // Stop the pusher
    pusher.stop()

    // Advance past the interval
    vi.advanceTimersByTime(60000)

    // Should not have been called again
    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('should fire at the correct interval', async () => {
    mockFindMany.mockResolvedValue([])

    const pusher = createAlertPusher(createDeps())
    pusher.start()

    // Wait for initial async call
    await vi.runAllTicks()

    // Clear the initial call count
    vi.clearAllMocks()
    mockFindMany.mockResolvedValue([])

    // Advance past two intervals
    vi.advanceTimersByTime(60000)
    await vi.runAllTicks()
    expect(mockFindMany).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(60000)
    await vi.runAllTicks()
    expect(mockFindMany).toHaveBeenCalledTimes(2)
  })
})
