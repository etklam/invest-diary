import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { createPriceAlertChecker } from '~/server/schedulers/price-alert-checker'

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

describe('createPriceAlertChecker', () => {
  const mockFindMany = vi.fn()
  const mockUpdate = vi.fn()
  const mockIsUserConnected = vi.fn()
  const mockEmitToUser = vi.fn()
  const mockFetchQuote = vi.fn()
  const mockLoggerInfo = vi.fn()
  const mockLoggerError = vi.fn()

  const createDeps = () => ({
    prisma: {
      priceAlert: {
        findMany: mockFindMany,
        update: mockUpdate,
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
    fetchQuote: mockFetchQuote,
  })

  /**
   * Creates a minimal mock PriceAlert record.
   * Use `t` (a number) for threshold – `Number()` will coerce it correctly.
   */
  const makePriceAlert = (overrides: Record<string, unknown> = {}) => ({
    id: 1n,
    userId: 5n,
    symbol: 'AAPL',
    type: 'PRICE_ABOVE' as const,
    threshold: 200,
    message: 'AAPL above $200',
    isTriggered: false,
    triggeredAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  })

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should check untriggered price alerts on start', async () => {
    mockFindMany.mockResolvedValueOnce([])

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { isTriggered: false },
    })
  })

  it('should fetch quotes only for unique symbols', async () => {
    const alerts = [
      makePriceAlert({ id: 1n, symbol: 'AAPL' }),
      makePriceAlert({ id: 2n, symbol: 'AAPL', threshold: 180 }),
      makePriceAlert({ id: 3n, symbol: 'GOOGL' }),
    ]
    mockFindMany.mockResolvedValueOnce(alerts)
    mockFetchQuote.mockResolvedValue({ regularMarketPrice: 150 })

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    // fetchQuote should only be called once per unique symbol
    expect(mockFetchQuote).toHaveBeenCalledTimes(2)
    expect(mockFetchQuote).toHaveBeenCalledWith('AAPL')
    expect(mockFetchQuote).toHaveBeenCalledWith('GOOGL')
  })

  it('should trigger PRICE_ABOVE alert when price exceeds threshold', async () => {
    mockFindMany.mockResolvedValueOnce([
      makePriceAlert({ id: 1n, type: 'PRICE_ABOVE', threshold: 200 }),
    ])
    mockFetchQuote.mockResolvedValueOnce({ regularMarketPrice: 210 })
    mockIsUserConnected.mockReturnValue(true)
    mockEmitToUser.mockReturnValue(true)
    mockUpdate.mockResolvedValueOnce({})

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    // Should mark as triggered
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        isTriggered: true,
        triggeredAt: expect.any(Date),
      },
    })
    // Should push to user
    expect(mockEmitToUser).toHaveBeenCalledWith(
      '5',
      'price-alert:triggered',
      expect.objectContaining({
        id: '1',
        symbol: 'AAPL',
        type: 'PRICE_ABOVE',
        threshold: 200,
        currentPrice: 210,
        message: 'AAPL above $200',
      })
    )
  })

  it('should NOT trigger PRICE_ABOVE when price is below threshold', async () => {
    mockFindMany.mockResolvedValueOnce([
      makePriceAlert({ id: 1n, type: 'PRICE_ABOVE', threshold: 200 }),
    ])
    mockFetchQuote.mockResolvedValueOnce({ regularMarketPrice: 190 })

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockEmitToUser).not.toHaveBeenCalled()
  })

  it('should trigger PRICE_BELOW alert when price falls below threshold', async () => {
    mockFindMany.mockResolvedValueOnce([
      makePriceAlert({ id: 1n, type: 'PRICE_BELOW', threshold: 100 }),
    ])
    mockFetchQuote.mockResolvedValueOnce({ regularMarketPrice: 95 })
    mockIsUserConnected.mockReturnValue(true)
    mockEmitToUser.mockReturnValue(true)
    mockUpdate.mockResolvedValueOnce({})

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 1n },
      data: {
        isTriggered: true,
        triggeredAt: expect.any(Date),
      },
    })
    expect(mockEmitToUser).toHaveBeenCalledWith(
      '5',
      'price-alert:triggered',
      expect.objectContaining({
        type: 'PRICE_BELOW',
        currentPrice: 95,
      })
    )
  })

  it('should NOT trigger PRICE_BELOW when price is above threshold', async () => {
    mockFindMany.mockResolvedValueOnce([
      makePriceAlert({ id: 1n, type: 'PRICE_BELOW', threshold: 100 }),
    ])
    mockFetchQuote.mockResolvedValueOnce({ regularMarketPrice: 105 })

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('should skip CHANGE_PERCENT alerts (stub — not implemented)', async () => {
    mockFindMany.mockResolvedValueOnce([
      makePriceAlert({ id: 1n, type: 'CHANGE_PERCENT', threshold: 5 }),
    ])
    mockFetchQuote.mockResolvedValueOnce({ regularMarketPrice: 100 })

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    // CHANGE_PERCENT is a stub — should not trigger or update
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockEmitToUser).not.toHaveBeenCalled()
  })

  it('should skip MOVING_AVG alerts (stub — not implemented)', async () => {
    mockFindMany.mockResolvedValueOnce([
      makePriceAlert({ id: 1n, type: 'MOVING_AVG', threshold: 50 }),
    ])
    mockFetchQuote.mockResolvedValueOnce({ regularMarketPrice: 100 })

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    // MOVING_AVG is a stub — should not trigger or update
    expect(mockUpdate).not.toHaveBeenCalled()
    expect(mockEmitToUser).not.toHaveBeenCalled()
  })

  it('should skip alerts for symbols with failed quotes', async () => {
    mockFindMany.mockResolvedValueOnce([
      makePriceAlert({ id: 1n, symbol: 'BADSYMBOL', type: 'PRICE_ABOVE' }),
    ])
    mockFetchQuote.mockRejectedValueOnce(new Error('Symbol not found'))

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.stringContaining('Failed to fetch quote for BADSYMBOL')
    )
    expect(mockUpdate).not.toHaveBeenCalled()
  })

  it('should continue processing other alerts when one fails', async () => {
    const alerts = [
      makePriceAlert({ id: 1n, symbol: 'AAPL', type: 'PRICE_ABOVE', threshold: 200 }),
      makePriceAlert({ id: 2n, symbol: 'GOOGL', type: 'PRICE_ABOVE', threshold: 100 }),
    ]
    mockFindMany.mockResolvedValueOnce(alerts)
    mockFetchQuote
      .mockResolvedValueOnce({ regularMarketPrice: 210 }) // AAPL
      .mockResolvedValueOnce({ regularMarketPrice: 110 }) // GOOGL
    mockIsUserConnected.mockReturnValue(true)
    mockEmitToUser.mockReturnValue(true)
    // First update succeeds, second throws
    mockUpdate
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('Update failed'))

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    // Both should be attempted
    expect(mockUpdate).toHaveBeenCalledTimes(2)
    // Error for second alert should be logged
    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Failed to process price alert 2'),
      expect.any(Error)
    )
  })

  it('should handle findMany errors gracefully', async () => {
    mockFindMany.mockRejectedValueOnce(new Error('DB error'))

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    expect(mockLoggerError).toHaveBeenCalledWith(
      expect.stringContaining('Error checking price alerts'),
      expect.any(Error)
    )
  })

  it('should stop the interval when stop() is called', async () => {
    mockFindMany.mockResolvedValue([])

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()
    vi.clearAllMocks()

    checker.stop()

    vi.advanceTimersByTime(5 * 60000)
    await flushAllMicrotasks()

    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('should fire at the correct interval (5 minutes)', async () => {
    mockFindMany.mockResolvedValue([])

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    vi.clearAllMocks()
    mockFindMany.mockResolvedValue([])

    vi.advanceTimersByTime(5 * 60000)
    await flushAllMicrotasks()

    expect(mockFindMany).toHaveBeenCalledTimes(1)
  })

  it('should not push to offline users even when alert triggers', async () => {
    mockFindMany.mockResolvedValueOnce([
      makePriceAlert({ id: 1n, type: 'PRICE_ABOVE', threshold: 200 }),
    ])
    mockFetchQuote.mockResolvedValueOnce({ regularMarketPrice: 210 })
    mockIsUserConnected.mockReturnValue(false)
    mockUpdate.mockResolvedValueOnce({})

    const checker = createPriceAlertChecker(createDeps())
    checker.start()

    await flushAllMicrotasks()

    // Should still update DB (mark as triggered)
    expect(mockUpdate).toHaveBeenCalled()
    // But should not push
    expect(mockEmitToUser).not.toHaveBeenCalled()
    // Should log that user is offline
    expect(mockLoggerInfo).toHaveBeenCalledWith(
      expect.stringContaining('User 5 is offline')
    )
  })
})
