import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'

const mockFindMany = vi.fn()
const mockIsUserConnected = vi.fn()
const mockEmitToUser = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    alert: {
      findMany: mockFindMany,
    },
  },
}))

vi.mock('~/server/websocket/connectionManager', () => ({
  connectionManager: {
    isUserConnected: (...args: any[]) => mockIsUserConnected(...args),
    emitToUser: (...args: any[]) => mockEmitToUser(...args),
  },
}))

describe('alert-scheduler plugin', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
    vi.stubGlobal('defineNitroPlugin', (fn: any) => fn)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.SCHEDULER_ENABLED
    vi.useRealTimers()
  })

  it('does nothing when scheduler is disabled', async () => {
    process.env.SCHEDULER_ENABLED = 'false'

    const plugin = (await import('~/server/plugins/alert-scheduler')).default
    plugin()

    expect(mockFindMany).not.toHaveBeenCalled()
  })

  it('pushes alerts to connected users on startup', async () => {
    process.env.SCHEDULER_ENABLED = 'true'
    vi.useFakeTimers()

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
    mockIsUserConnected.mockReturnValue(true)
    mockEmitToUser.mockReturnValue(true)

    const plugin = (await import('~/server/plugins/alert-scheduler')).default
    plugin()

    await Promise.resolve()

    expect(mockFindMany).toHaveBeenCalledTimes(1)
    expect(mockIsUserConnected).toHaveBeenCalledWith('5')
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
})
