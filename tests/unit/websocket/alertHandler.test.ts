import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockDismissAlert = vi.fn()
const mockAuthenticateAccessToken = vi.fn()

vi.mock('~/server/utils/alert-queries', () => ({
  dismissAlert: mockDismissAlert,
}))

vi.mock('~/server/utils/auth-session', () => ({
  authenticateAccessToken: mockAuthenticateAccessToken,
}))

// ── Helpers ──────────────────────────────────────────────────────────────
function makeSocket(userId: string) {
  const handlers: Record<string, Function> = {}
  const socket = {
    id: `socket-${userId}-${Math.random().toString(36).slice(2, 6)}`,
    data: {
      userId,
      accessToken: `token-${userId}`,
      expiresAt: new Date(Date.now() + 60_000),
      tokenVersion: 0,
    },
    connected: true,
    disconnect: vi.fn(function () {
      this.connected = false
    }),
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
    mockAuthenticateAccessToken.mockImplementation(async (token: string) => ({
      id: token.replace('token-', ''),
      email: 'socket@example.test',
      role: 'USER',
    }))
  })

  describe('alert:dismiss', () => {
    it('successfully dismisses alert owned by the user', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)

      mockDismissAlert.mockResolvedValue({
        id: BigInt(42),
      })

      // Simulate client emitting 'alert:dismiss'
      await socket._handlers['alert:dismiss']('42')

      expect(mockDismissAlert).toHaveBeenCalledWith('42', BigInt('1'))
      expect(socket.emit).toHaveBeenCalledWith('alert:dismissed', { alertId: '42' })
    })

    it('sends alert:error when alert is not found', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)

      mockDismissAlert.mockRejectedValue({ statusCode: 404 })

      await socket._handlers['alert:dismiss']('99')

      expect(socket.emit).toHaveBeenCalledWith('alert:error', {
        message: 'Alert not found or not authorized',
        alertId: '99',
      })
      expect(mockDismissAlert).toHaveBeenCalledWith('99', BigInt('1'))
    })

    it('sends alert:error when alert belongs to another user (diary ownership check)', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)

      mockDismissAlert.mockRejectedValue({ statusCode: 404 })

      await socket._handlers['alert:dismiss']('42')

      expect(mockDismissAlert).toHaveBeenCalledWith('42', BigInt('1'))
      expect(socket.emit).toHaveBeenCalledWith('alert:error', {
        message: 'Alert not found or not authorized',
        alertId: '42',
      })
    })

    it('sends alert:error when database update fails', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)

      mockDismissAlert.mockRejectedValue(new Error('DB connection lost'))

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

      mockDismissAlert.mockResolvedValue({ id: BigInt(10) })

      await socket._handlers['alert:dismiss']('10')

      expect(mockDismissAlert).toHaveBeenCalledWith('10', BigInt('2'))
      expect(socket.emit).toHaveBeenCalledWith('alert:dismissed', { alertId: '10' })
    })

    it('disconnects a revoked socket before applying a dismiss mutation', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)
      mockAuthenticateAccessToken.mockResolvedValueOnce(null)

      await socket._handlers['alert:dismiss']('42')

      expect(socket.disconnect).toHaveBeenCalledWith(true)
      expect(mockDismissAlert).not.toHaveBeenCalled()
      expect(socket.emit).not.toHaveBeenCalledWith('alert:dismissed', expect.anything())
    })

    it('disconnects when access-token verification throws', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)
      mockAuthenticateAccessToken.mockRejectedValueOnce(new Error('token expired'))

      await socket._handlers['alert:dismiss']('42')

      expect(socket.disconnect).toHaveBeenCalledWith(true)
      expect(mockDismissAlert).not.toHaveBeenCalled()
    })

    it('does not mutate after revocation disconnects the socket during authorization', async () => {
      const socket = makeSocket('1')
      const { setupAlertHandlers } = await import('~/server/websocket/alertHandler')
      setupAlertHandlers(socket as any)
      mockAuthenticateAccessToken.mockImplementationOnce(async () => {
        socket.disconnect(true)
        return { id: '1', email: 'socket@example.test', role: 'USER' }
      })

      await socket._handlers['alert:dismiss']('42')

      expect(mockDismissAlert).not.toHaveBeenCalled()
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
      mockDismissAlert.mockResolvedValue({ id: BigInt(1) })
      await socketA._handlers['alert:dismiss']('1')

      expect(socketA.emit).toHaveBeenCalledWith('alert:dismissed', { alertId: '1' })
      expect(socketB.emit).not.toHaveBeenCalled()

      vi.clearAllMocks()

      // User B dismisses their alert
      mockDismissAlert.mockResolvedValue({ id: BigInt(2) })
      await socketB._handlers['alert:dismiss']('2')

      expect(socketB.emit).toHaveBeenCalledWith('alert:dismissed', { alertId: '2' })
      expect(socketA.emit).not.toHaveBeenCalled()
    })
  })
})
