import { createServer, type Server as HttpServer } from 'node:http'
import { io as createClient, type Socket as ClientSocket } from 'socket.io-client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Server } from 'socket.io'
import type { ClientToServerEvents, InterServerEvents, ServerToClientEvents, SocketData } from '~/types/websocket'
import { connectionManager } from '~/server/websocket/connectionManager'

const mockAuthenticateAccessToken = vi.fn()
const mockDismissAlert = vi.fn()

vi.mock('~/server/utils/auth-session', () => ({
  authenticateAccessToken: mockAuthenticateAccessToken,
}))

vi.mock('~/server/utils/alert-queries', () => ({
  dismissAlert: mockDismissAlert,
}))

type SocketServer = Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
type Client = ClientSocket<ServerToClientEvents, ClientToServerEvents>
type ConnectionSuccess = { socketId: string; userId: string }

function closeServer(server: HttpServer): Promise<void> {
  if (!server.listening) return Promise.resolve()
  return new Promise((resolve, reject) => {
    server.close(error => error ? reject(error) : resolve())
  })
}

const describeSocketIntegration = process.env.SOCKET_IO_INTEGRATION === '1' ? describe : describe.skip

describeSocketIntegration('real Socket.IO integration contract', () => {
  let httpServer: HttpServer
  let socketServer: SocketServer | undefined
  let client: Client | undefined
  let clients: Client[] = []
  let port: number

  beforeEach(async () => {
    vi.clearAllMocks()
    process.env.NODE_ENV = 'test'
    delete process.env.NUXT_PUBLIC_SITE_URL
    mockAuthenticateAccessToken.mockResolvedValue({ id: '9007199254740993', email: 'socket@example.test', role: 'USER' })
    mockDismissAlert.mockResolvedValue({ id: 7n })

    httpServer = createServer()
    await new Promise<void>((resolve, reject) => {
      httpServer.once('error', reject)
      httpServer.listen(0, '127.0.0.1', () => resolve())
    })
    const address = httpServer.address()
    if (!address || typeof address === 'string') throw new Error('Socket.IO test server did not bind to a TCP port')
    port = address.port

    const module = await import('~/server/websocket/socket-server')
    socketServer = module.createSocketServer(httpServer)
  })

  afterEach(async () => {
    for (const activeClient of clients) activeClient.close()
    client?.close()
    clients = []
    client = undefined
    await socketServer?.close()
    socketServer = undefined
    await closeServer(httpServer)
  })

  async function connect(token: string): Promise<{ client: Client; success: ConnectionSuccess }> {
    const connectedClient = createClient(`http://127.0.0.1:${port}`, {
      path: '/socket.io/',
      auth: { token },
      transports: ['websocket'],
      forceNew: true,
    })
    clients.push(connectedClient)
    const connected = new Promise<void>((resolve, reject) => {
      connectedClient.once('connect', () => resolve())
      connectedClient.once('connect_error', reject)
    })
    const success = new Promise<ConnectionSuccess>((resolve, reject) => {
      connectedClient.once('connection:success', resolve)
      connectedClient.once('connect_error', reject)
    })
    await connected
    return { client: connectedClient, success: await success }
  }

  it('performs authenticated handshake, registers a user room, and preserves event wire types', async () => {
    const connection = await connect('valid-access-token')
    client = connection.client

    const success = connection.success
    expect(success.userId).toBe('9007199254740993')
    expect(success.socketId).toBe(client.id)
    expect(mockAuthenticateAccessToken).toHaveBeenCalledWith('valid-access-token')
    expect(socketServer?.sockets.adapter.rooms.has(`user:${success.userId}`)).toBe(true)

    const pong = new Promise<void>((resolve, reject) => {
      client?.once('pong', resolve)
      client?.once('connect_error', reject)
    })
    client.emit('ping')
    await pong

    const dismissed = new Promise<{ alertId: string }>((resolve, reject) => {
      client?.once('alert:dismissed', resolve)
      client?.once('connect_error', reject)
    })
    client.emit('alert:dismiss', '7')
    await dismissed
    expect(mockDismissAlert).toHaveBeenCalledWith('7', 9007199254740993n)
  })

  it('delivers a broadcast only to the matching user room', async () => {
    mockAuthenticateAccessToken.mockImplementation(async (token: string) => {
      if (token === 'user-a-token') return { id: '101', email: 'a@example.test', role: 'USER' }
      if (token === 'user-b-token') return { id: '202', email: 'b@example.test', role: 'USER' }
      return null
    })

    const userA = (await connect('user-a-token')).client
    const userB = (await connect('user-b-token')).client
    const receivedByA = new Promise<unknown>((resolve, reject) => {
      userA.once('alert:triggered', resolve)
      userA.once('disconnect', () => reject(new Error('user A disconnected before receiving alert')))
    })
    const receivedByB = new Promise<'received' | 'quiet'>(resolve => {
      userB.once('alert:triggered', () => resolve('received'))
      setTimeout(() => resolve('quiet'), 100)
    })
    const payload = {
      id: 'alert-101',
      message: 'Only user A should receive this',
      triggerAt: '2026-09-04T09:00:00.000Z',
      diary: { id: 'diary-101', title: 'A diary' },
    }

    expect(connectionManager.emitToUser('101', 'alert:triggered', payload)).toBe(true)
    await expect(receivedByA).resolves.toEqual(payload)
    await expect(receivedByB).resolves.toBe('quiet')
    expect(userA.connected).toBe(true)
    expect(userB.connected).toBe(true)
  })

  it('returns an error acknowledgement when an alert handler fails without dropping the socket', async () => {
    client = (await connect('valid-access-token')).client
    mockDismissAlert.mockRejectedValueOnce(new Error('database unavailable'))

    const error = new Promise<{ message: string; alertId?: string }>((resolve, reject) => {
      client?.once('alert:error', resolve)
      client?.once('disconnect', () => reject(new Error('socket disconnected after handler failure')))
    })
    client.emit('alert:dismiss', '7')

    await expect(error).resolves.toEqual({
      message: 'Failed to dismiss alert',
      alertId: '7',
    })
    expect(client.connected).toBe(true)
  })

  it('can disconnect and reconnect while re-registering the user room', async () => {
    client = (await connect('valid-access-token')).client
    const firstSocketId = client.id

    await new Promise<void>((resolve, reject) => {
      client?.once('disconnect', () => resolve())
      client?.once('connect_error', reject)
      client?.disconnect()
    })
    await vi.waitFor(() => {
      expect(connectionManager.isUserConnected('9007199254740993')).toBe(false)
    })

    const reconnected = new Promise<{ socketId: string; userId: string }>((resolve, reject) => {
      client?.once('connection:success', resolve)
      client?.once('connect_error', reject)
      client?.connect()
    })
    await expect(reconnected).resolves.toMatchObject({
      userId: '9007199254740993',
    })
    expect(client.id).not.toBe(firstSocketId)
    expect(connectionManager.isUserConnected('9007199254740993')).toBe(true)
  })

  it('rejects unauthenticated, expired, and invalid-token handshakes before connection registration', async () => {
    const noToken = createClient(`http://127.0.0.1:${port}`, {
      path: '/socket.io/',
      transports: ['websocket'],
      forceNew: true,
    })
    clients.push(noToken)
    await expect(new Promise<never>((_, reject) => {
      noToken.once('connect_error', reject)
    })).rejects.toMatchObject({ message: 'Authentication required' })
    noToken.close()

    // The production verifier owns expiry parsing. The real Socket.IO
    // transport must still turn that verifier rejection into a clean
    // connection error without registering a room.
    mockAuthenticateAccessToken.mockResolvedValueOnce(null)
    const expiredClient = createClient(`http://127.0.0.1:${port}`, {
      path: '/socket.io/',
      auth: { token: 'expired-access-token' },
      transports: ['websocket'],
      forceNew: true,
    })
    clients.push(expiredClient)
    await expect(new Promise<never>((_, reject) => {
      expiredClient.once('connect_error', reject)
    })).rejects.toMatchObject({ message: 'Invalid token' })
    expiredClient.close()

    mockAuthenticateAccessToken.mockResolvedValueOnce(null)
    client = createClient(`http://127.0.0.1:${port}`, {
      path: '/socket.io/',
      auth: { token: 'revoked-access-token' },
      transports: ['websocket'],
      forceNew: true,
    })
    await expect(new Promise<never>((_, reject) => {
      client?.once('connect_error', reject)
    })).rejects.toMatchObject({ message: 'Invalid token' })
    expect(socketServer?.sockets.sockets.size).toBe(0)
  })
})
