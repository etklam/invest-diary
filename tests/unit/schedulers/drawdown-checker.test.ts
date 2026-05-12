import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createDrawdownChecker } from '~/server/schedulers/drawdown-checker'

/**
 * With vi.useFakeTimers(), await inside loops spawns microtasks that
 * vi.runAllTicks() doesn't always recurse into. This helper flushes the
 * microtask queue repeatedly to drain all nested promises.
 */
async function flushAllMicrotasks(iterations = 10) {
  for (let i = 0; i < iterations; i++) {
    await vi.runAllTicks()
  }
}

describe('createDrawdownChecker', () => {
  const mockFindMany = vi.fn()
  const mockIsUserConnected = vi.fn()
  const mockEmitToUser = vi.fn()
  const mockCheckDrawdown = vi.fn()
  const mockLoggerInfo = vi.fn()
  const mockLoggerError = vi.fn()

  const createDeps = (overrides = {}) => ({
    prisma: {
      portfolioSnapshot: {
        findMany: mockFindMany,
      },
    },
    broadcaster: {
      isUserConnected: mockIsUserConnected,
      emitToUser: mockEmitToUser,
    },
    logger: {
      info: mockLoggerInfo,
      error: mockLoggerError,
    },
    checkDrawdown: mockCheckDrawdown,
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should check drawdown for connected users with snapshots on start', async () => {
    mockFindMany.mockResolvedValueOnce([
      { userId: 1n },
      { userId: 2n },
    ])
    mockIsUserConnected.mockReturnValue(true)
    mockCheckDrawdown.mockResolvedValue({
      hasAlert: false,
      payload: null,
    })

    const checker = createDrawdownChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany).toHaveBeenCalledWith({
      select: { userId: true },
      distinct: ['userId'],
    })
    expect(mockIsUserConnected).toHaveBeenCalledWith('1')
    expect(mockIsUserConnected).toHaveBeenCalledWith('2')
    expect(mockCheckDrawdown).toHaveBeenCalledTimes(2)
    expect(mockCheckDrawdown).toHaveBeenCalledWith({
      userId: 1n,
      thresholdPct: 10,
    })
  })

  it('should emit drawdown alert when threshold is exceeded', async () => {
    const payload = {
      currentValue: 9000,
      peakValue: 10000,
      drawdownPct: 10.0,
      threshold: 10,
      peakDate: '2026-01-15',
      currentDate: '2026-03-13',
      message: 'Portfolio drawdown of 10%...',
      benchmarkSymbol: 'SPY',
    }

    mockFindMany.mockResolvedValueOnce([{ userId: 5n }])
    mockIsUserConnected.mockReturnValue(true)
    mockCheckDrawdown.mockResolvedValueOnce({
      hasAlert: true,
      payload,
    })
    mockEmitToUser.mockReturnValue(true)

    const checker = createDrawdownChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockEmitToUser).toHaveBeenCalledWith('5', 'drawdown:alert', payload)
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.stringContaining('Pushed drawdown alert to user 5 (drawdown: 10%)')
    )
  })

  it('should skip offline users', async () => {
    mockFindMany.mockResolvedValueOnce([
      { userId: 1n },
      { userId: 2n },
    ])
    // User 1 connected, user 2 offline
    mockIsUserConnected
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false)
    mockCheckDrawdown.mockResolvedValue({
      hasAlert: false,
      payload: null,
    })

    const checker = createDrawdownChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    // Only user 1 should be checked
    expect(mockIsUserConnected).toHaveBeenCalledTimes(2)
    expect(mockCheckDrawdown).toHaveBeenCalledTimes(1)
    expect(mockCheckDrawdown).toHaveBeenCalledWith({
      userId: 1n,
      thresholdPct: 10,
    })
  })

  it('should handle empty snapshot list', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const checker = createDrawdownChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockIsUserConnected).not.toHaveBeenCalled()
    expect(mockCheckDrawdown).not.toHaveBeenCalled()
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.stringContaining('No users with portfolio snapshots')
    )
  })

  it('should use custom drawdown threshold when provided', async () => {
    mockFindMany.mockResolvedValueOnce([{ userId: 1n }])
    mockIsUserConnected.mockReturnValue(true)
    mockCheckDrawdown.mockResolvedValue({
      hasAlert: false,
      payload: null,
    })

    const checker = createDrawdownChecker(createDeps({ drawdownThreshold: 15 }))
    checker.start()

    await flushAllMicrotasks()

    expect(mockCheckDrawdown).toHaveBeenCalledWith({
      userId: 1n,
      thresholdPct: 15,
    })
  })

  it('should continue checking other users when one fails', async () => {
    mockFindMany.mockResolvedValueOnce([
      { userId: 1n },
      { userId: 2n },
    ])
    mockIsUserConnected.mockReturnValue(true)
    mockCheckDrawdown
      .mockRejectedValueOnce(new Error('Check failed'))
      .mockResolvedValueOnce({
        hasAlert: true,
        payload: {
          currentValue: 8000,
          peakValue: 10000,
          drawdownPct: 20,
          threshold: 10,
          peakDate: '2026-01-01',
          currentDate: '2026-03-13',
          message: 'Drawdown!',
          benchmarkSymbol: 'SPY',
        },
      })
    mockEmitToUser.mockReturnValue(true)

    const checker = createDrawdownChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    // Both users should be attempted
    expect(mockCheckDrawdown).toHaveBeenCalledTimes(2)
    // Error for first user should be logged
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to check drawdown for user 1'),
      expect.any(Error)
    )
    // Second user should still get push
    expect(mockEmitToUser).toHaveBeenCalledWith('2', 'drawdown:alert', expect.any(Object))
  })

  it('should handle findMany errors gracefully', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('DB error'))

    const checker = createDrawdownChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Error checking drawdown alerts'),
      expect.any(Error)
    )
  })

  it('should stop the interval when stop() is called', async () => {
    mockFindMany.mockResolvedValue([])

    const checker = createDrawdownChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()
    vi.clearAllMocks()

    checker.stop()

    // Advance past interval
    vi.advanceTimersByTime(5 * 60000)
    await flushAllMicrotasks()

    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('should fire at the correct interval (5 minutes)', async () => {
    mockFindMany.mockResolvedValue([])

    const checker = createDrawdownChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    vi.clearAllMocks()
    mockFindMany.mockResolvedValue([])

    // Advance one interval
    vi.advanceTimersByTime(5 * 60000)
    await flushAllMicrotasks()

    expect(mockFindMany).toHaveBeenCalledTimes(1)
  })
})
