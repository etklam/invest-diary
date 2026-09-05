import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { connectionManager } from '~/server/websocket/connectionManager'

const makeSocket = (id: string) => ({
  id,
  emit: vi.fn(),
  disconnect: vi.fn(),
  data: { expiresAt: new Date(Date.now() + 60_000), tokenVersion: 0 },
})

describe('connectionManager', () => {
  const resetManager = () => {
    for (const timer of (connectionManager as any).revocationCleanupTimers.values()) {
      clearTimeout(timer as ReturnType<typeof setTimeout>)
    }
    ;(connectionManager as any).connections.clear()
    ;(connectionManager as any).socketToUser.clear()
    ;(connectionManager as any).minimumTokenVersions.clear()
    ;(connectionManager as any).revocationCleanupTimers.clear()
  }

  beforeEach(() => {
    resetManager()
  })

  afterEach(() => {
    resetManager()
    vi.restoreAllMocks()
  })

  it('registers sockets and reports stats', () => {
    const socketA = makeSocket('socket-a')
    const socketB = makeSocket('socket-b')

    connectionManager.register('user-1', socketA as any)
    connectionManager.register('user-1', socketB as any)

    expect(connectionManager.isUserConnected('user-1')).toBe(true)
    expect(connectionManager.getConnectionCount('user-1')).toBe(2)
    expect(connectionManager.getTotalConnections()).toBe(2)
    expect(connectionManager.getOnlineUserCount()).toBe(1)
    expect(connectionManager.getOnlineUserIds()).toEqual(['user-1'])
    expect(connectionManager.getStats()).toEqual({
      totalSockets: 2,
      onlineUsers: 1,
      avgSocketsPerUser: 2,
    })
  })

  it('emits to connected users and returns false when offline', () => {
    const socket = makeSocket('socket-c')

    expect(connectionManager.emitToUser('user-2', 'alert:triggered', { ok: true })).toBe(false)

    connectionManager.register('user-2', socket as any)

    expect(connectionManager.emitToUser('user-2', 'alert:triggered', { ok: true })).toBe(true)
    expect(socket.emit).toHaveBeenCalledWith('alert:triggered', { ok: true })
  })

  it('broadcasts to all sockets', () => {
    const socket1 = makeSocket('socket-d')
    const socket2 = makeSocket('socket-e')

    connectionManager.register('user-3', socket1 as any)
    connectionManager.register('user-4', socket2 as any)

    const count = connectionManager.broadcast('alert:triggered', { id: '1' })

    expect(count).toBe(2)
    expect(socket1.emit).toHaveBeenCalledWith('alert:triggered', { id: '1' })
    expect(socket2.emit).toHaveBeenCalledWith('alert:triggered', { id: '1' })
  })

  it('unregisters sockets and handles unknown socket IDs', () => {
    const socket = makeSocket('socket-f')
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

    connectionManager.unregister('missing-socket')
    expect(warnSpy).toHaveBeenCalled()

    connectionManager.register('user-5', socket as any)
    connectionManager.unregister('socket-f')

    expect(connectionManager.isUserConnected('user-5')).toBe(false)
    expect(connectionManager.getTotalConnections()).toBe(0)
  })

  it('disconnects every socket for one revoked user without affecting others', () => {
    const socketA = makeSocket('socket-g')
    const socketB = makeSocket('socket-h')
    const otherSocket = makeSocket('socket-i')

    connectionManager.register('user-6', socketA as any)
    connectionManager.register('user-6', socketB as any)
    connectionManager.register('user-7', otherSocket as any)

    expect(connectionManager.disconnectUser('user-6')).toBe(2)
    expect(socketA.disconnect).toHaveBeenCalledWith(true)
    expect(socketB.disconnect).toHaveBeenCalledWith(true)
    expect(otherSocket.disconnect).not.toHaveBeenCalled()
    expect(connectionManager.isUserConnected('user-6')).toBe(false)
    expect(connectionManager.isUserConnected('user-7')).toBe(true)
  })

  it('drops expired sockets before a private push', () => {
    const socket = makeSocket('socket-j')
    socket.data.expiresAt = new Date(Date.now() - 1)
    connectionManager.register('user-8', socket as any)

    expect(connectionManager.emitToUser('user-8', 'alert:triggered', { id: 'private' } as any)).toBe(false)
    expect(socket.emit).not.toHaveBeenCalled()
    expect(socket.disconnect).toHaveBeenCalledWith(true)
  })

  it('rejects a delayed handshake carrying a pre-revocation tokenVersion', () => {
    const oldSocket = makeSocket('socket-k')
    const freshSocket = makeSocket('socket-l')
    freshSocket.data.tokenVersion = 2
    connectionManager.revokeUser('user-9', 2)

    expect(connectionManager.register('user-9', oldSocket as any)).toBe(false)
    expect(oldSocket.disconnect).toHaveBeenCalledWith(true)
    expect(connectionManager.register('user-9', freshSocket as any)).toBe(true)
  })

  it('retains the revocation floor for one access-token lifetime, then releases it', () => {
    vi.useFakeTimers()
    const oldSocket = makeSocket('socket-m')
    connectionManager.revokeUser('user-10', 3)

    vi.advanceTimersByTime(60 * 60 * 1000 - 1)
    expect(connectionManager.register('user-10', oldSocket as any)).toBe(false)

    vi.advanceTimersByTime(1)
    const expiredTokenSocket = makeSocket('socket-n')
    expect(connectionManager.register('user-10', expiredTokenSocket as any)).toBe(true)
    vi.useRealTimers()
  })
})
