import { describe, it, expect, vi, beforeEach } from 'vitest'

// ── Prisma mock ──────────────────────────────────────────────────────────
const mockAlertFindFirst = vi.fn()
const mockAlertUpdate = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    alert: {
      findFirst: mockAlertFindFirst,
      update: mockAlertUpdate,
    },
  },
}))

// ── Helpers ──────────────────────────────────────────────────────────────
function makeSocket(userId: string) {
  const handlers: Record<string, Function> = {}
  const socket = {
    id: `socket-${userId}-${Math.random().toString(36).slice(2, 6)}`,
    data: { userId },
    emit: vi.fn(),
    on: vi.fn((event: string, handler: Function) => {
      handlers[event] = handler
    }),
    _handlers: handlers,
  }
  return socket
}

// ── Tests ────────────────────────────────────────────────────────────────
describe('setupAlertHandlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('alert:dismiss', () => {
    it('successfully dismisses alert owned by the user', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)

      mockAlertFindFirst.mockResolvedValue({
        id: BigInt(42),
        diary: { userId: BigInt(1) },
      })
      mockAlertUpdate.mockResolvedValue({ id: BigInt(42), isDismissed: true })

      // Simulate client emitting 'alert:dismiss'
      await socket._handlers['alert:dismiss']('42')

      expect(mockAlertFindFirst).toHaveBeenCalledWith({
        where: {
          id: BigInt('42'),
          diary: { userId: BigInt('1') },
        },
        include: { diary: { select: { userId: true } } },
      })
      expect(mockAlertUpdate).toHaveBeenCalledWith({
        where: { id: BigInt('42') },
        data: { isDismissed: true },
      })
      expect(socket.emit).toHaveBeenCalledWith('alert:dismissed', { alertId: '42' })
    })

    it('sends alert:error when alert is not found', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)

      mockAlertFindFirst.mockResolvedValue(null)

      await socket._handlers['alert:dismiss']('99')

      expect(socket.emit).toHaveBeenCalledWith('alert:error', {
        message: 'Alert not found or not authorized',
        alertId: '99',
      })
      expect(mockAlertUpdate).not.toHaveBeenCalled()
    })

    it('sends alert:error when alert belongs to another user (diary ownership check)', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)

      // findFirst returns null because the diary.userId doesn't match
      mockAlertFindFirst.mockResolvedValue(null)

      await socket._handlers['alert:dismiss']('42')

      expect(mockAlertFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: BigInt('42'),
          diary: { userId: BigInt('1') },
        }),
      }))
      expect(socket.emit).toHaveBeenCalledWith('alert:error', {
        message: 'Alert not found or not authorized',
        alertId: '42',
      })
    })

    it('sends alert:error when database update fails', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)

      mockAlertFindFirst.mockResolvedValue({
        id: BigInt(42),
        diary: { userId: BigInt(1) },
      })
      mockAlertUpdate.mockRejectedValue(new Error('DB connection lost'))

      await socket._handlers['alert:dismiss']('42')

      expect(socket.emit).toHaveBeenCalledWith('alert:error', {
        message: 'Failed to dismiss alert',
        alertId: '42',
      })
    })

    it('verifies diary-level ownership (userId scoped within diary relation)', async () => {
      const socket = makeSocket('2')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)

      mockAlertFindFirst.mockResolvedValue({
        id: BigInt(10),
        diary: { userId: BigInt(2) },
      })
      mockAlertUpdate.mockResolvedValue({ id: BigInt(10), isDismissed: true })

      await socket._handlers['alert:dismiss']('10')

      // Should find the alert since diary.userId matches socket.data.userId (2)
      expect(mockAlertFindFirst).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          id: BigInt('10'),
          diary: { userId: BigInt('2') },
        }),
      }))
      expect(mockAlertUpdate).toHaveBeenCalled()
      expect(socket.emit).toHaveBeenCalledWith('alert:dismissed', { alertId: '10' })
    })
  })

  describe('multiple alerts across users', () => {
    it('each socket has its own isolated handler', async () => {
      const socketA = makeSocket('1')
      const socketB = makeSocket('2')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socketA as any)
      setupAlertHandlers(socketB as any)

      // User A dismisses their alert
      mockAlertFindFirst.mockResolvedValue({
        id: BigInt(1),
        diary: { userId: BigInt(1) },
      })
      mockAlertUpdate.mockResolvedValue({ id: BigInt(1), isDismissed: true })
      await socketA._handlers['alert:dismiss']('1')

      expect(socketA.emit).toHaveBeenCalledWith('alert:dismissed', { alertId: '1' })
      expect(socketB.emit).not.toHaveBeenCalled()

      vi.clearAllMocks()

      // User B dismisses their alert
      mockAlertFindFirst.mockResolvedValue({
        id: BigInt(2),
        diary: { userId: BigInt(2) },
      })
      mockAlertUpdate.mockResolvedValue({ id: BigInt(2), isDismissed: true })
      await socketB._handlers['alert:dismiss']('2')

      expect(socketB.emit).toHaveBeenCalledWith('alert:dismissed', { alertId: '2' })
      expect(socketA.emit).not.toHaveBeenCalled()
    })
  })
})
