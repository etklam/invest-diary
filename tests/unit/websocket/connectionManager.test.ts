import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { connectionManager } from '~/server/websocket/connectionManager'

const makeSocket = (id: string) => ({
  id,
  emit: vi.fn(),
})

describe('connectionManager', () => {
  const resetManager = () => {
    ;(connectionManager as any).connections.clear()
    ;(connectionManager as any).socketToUser.clear()
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
})
