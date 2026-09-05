import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

describe('websocket client regressions', () => {
  it('keeps reconnect state instead of tearing down the socket on transient connect errors', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')

    expect(source).toContain("currentSocket.io.on('reconnect_attempt'")
    expect(source).toContain("if (currentSocket.active) {")
    expect(source).not.toContain("connectionStatus.value = 'error'\n    disconnect()")
  })

  it('reuses alert subscriptions when a new socket instance is created', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')

    expect(source).toContain('const alertSubscribers = new Set')
    expect(source).toContain('attachAlertSubscribers(currentSocket)')
    expect(source).toContain('alertSubscribers.add(cb)')
  })

  it('reuses an active socket during reconnect instead of opening duplicates', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')

    expect(source).toContain('if (socket.active) {')
    expect(source).toContain("connectionStatus.value = 'reconnecting'")
    expect(source).toContain('socket.connect()')
    expect(source).toContain('autoConnect: false')
  })

  it('starts with polling and enables fallback transport probing', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf-8')

    expect(source).toContain("transports: ['polling', 'websocket']")
    expect(source).toContain('tryAllTransports: true')
  })

  it('bounds dismissAlert with a timeout and settles pending dismisses when the socket dies', () => {
    const source = readFileSync(resolve(process.cwd(), 'plugins/websocket.client.ts'), 'utf8')

    // Timeout race: server silence or a mismatched id must resolve false so
    // the HTTP fallback in useAlerts can run.
    expect(source).toContain('DISMISS_TIMEOUT_MS')
    expect(source).toContain('pendingDismissSettlers.add(settle)')
    // Socket death (disconnect) and manual teardown (destroySocket) must both
    // unblock every waiting caller.
    expect(source.match(/settlePendingDismisses\(false\)/g)?.length).toBe(2)
  })
})

// Exercise plugin event handlers with real Vue refs and a controllable Socket.IO peer.
import { beforeEach, afterEach, vi } from 'vitest'
import { EventEmitter } from 'node:events'
import { ref, readonly } from 'vue'
const mockIo = vi.hoisted(() => vi.fn())
vi.mock('socket.io-client', () => ({ io: mockIo }))

class Peer extends EventEmitter {
  active = false
  connected = false
  io = new EventEmitter()
  connect = vi.fn(() => this)
  disconnect = vi.fn(() => this)
}

describe('websocket session recovery behavior', () => {
  let peer: Peer
  let refreshAccessToken: ReturnType<typeof vi.fn>
  let websocket: any
  beforeEach(async () => {
    vi.resetModules()
    peer = new Peer()
    mockIo.mockReturnValue(peer)
    refreshAccessToken = vi.fn()
    vi.stubGlobal('ref', ref)
    vi.stubGlobal('readonly', readonly)
    vi.stubGlobal('defineNuxtPlugin', (plugin: () => unknown) => plugin)
    vi.stubGlobal('useState', () => ref({ id: 'owner' }))
    vi.stubGlobal('useRoute', () => ({ path: '/timeline', meta: {} }))
    vi.stubGlobal('useNuxtApp', () => ({ hook: vi.fn() }))
    vi.stubGlobal('watch', (_sources: unknown, run: () => void) => run())
    vi.stubGlobal('useAuth', () => ({ refreshAccessToken }))
    const plugin = (await import('../../plugins/websocket.client')).default
    websocket = (plugin as any)().provide.websocket
    peer.emit('connect')
  })
  afterEach(() => { window.removeEventListener('beforeunload', websocket.disconnect); websocket.disconnect(); vi.unstubAllGlobals(); vi.clearAllMocks() })

  it('refreshes and reconnects after server expiry without navigating away', async () => {
    refreshAccessToken.mockResolvedValue(true)
    peer.emit('disconnect', 'io server disconnect')
    await vi.waitFor(() => expect(peer.connect).toHaveBeenCalledTimes(2))
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(websocket.connectionStatus.value).toBe('reconnecting')
    peer.emit('connect')
    expect(websocket.isConnected.value).toBe(true)
  })

  it('preserves the existing authentication-error refresh path', async () => {
    refreshAccessToken.mockResolvedValue(true)
    peer.emit('connect_error', new Error('Invalid token'))
    await vi.waitFor(() => expect(peer.connect).toHaveBeenCalledTimes(2))
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
  })

  it('does not renew a manually disconnected connection', async () => {
    websocket.disconnect()
    peer.emit('disconnect', 'io client disconnect')
    await Promise.resolve()
    expect(refreshAccessToken).not.toHaveBeenCalled()
    expect(peer.connect).toHaveBeenCalledTimes(1)
    expect(websocket.connectionStatus.value).toBe('disconnected')
  })

  it('stops after revoked session refresh fails', async () => {
    refreshAccessToken.mockResolvedValue(false)
    peer.emit('disconnect', 'io server disconnect')
    await vi.waitFor(() => expect(websocket.connectionStatus.value).toBe('error'))
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(peer.connect).toHaveBeenCalledTimes(1)
    expect(peer.listenerCount('disconnect')).toBe(0)
  })

  it('does not reconnect after manual disconnect during an outstanding refresh', async () => {
    let finish!: (value: boolean) => void
    refreshAccessToken.mockReturnValue(new Promise<boolean>(resolve => { finish = resolve }))
    peer.emit('disconnect', 'io server disconnect')
    await vi.waitFor(() => expect(refreshAccessToken).toHaveBeenCalledTimes(1))
    websocket.disconnect()
    finish(true)
    await Promise.resolve()
    await Promise.resolve()
    expect(peer.connect).toHaveBeenCalledTimes(1)
    expect(websocket.connectionStatus.value).toBe('disconnected')
  })

  it('does not refresh twice when the refreshed cookie still fails authentication', async () => {
    refreshAccessToken.mockResolvedValue(true)
    peer.emit('disconnect', 'io server disconnect')
    await vi.waitFor(() => expect(peer.connect).toHaveBeenCalledTimes(2))
    peer.emit('connect_error', new Error('Authentication required'))
    await Promise.resolve()
    expect(refreshAccessToken).toHaveBeenCalledTimes(1)
    expect(peer.connect).toHaveBeenCalledTimes(2)
    expect(websocket.connectionStatus.value).toBe('error')
  })
})
