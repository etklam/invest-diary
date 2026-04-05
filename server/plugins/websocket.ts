import { Server } from 'socket.io'
import { Server as HttpServer } from 'node:http'
import { Server as HttpsServer } from 'node:https'
import type { NitroApp } from 'nitropack'
import { logger } from '~/lib/logger'
import { connectionManager } from '../websocket/connectionManager'
import { setupAlertHandlers } from '../websocket/alertHandler'
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/websocket'
import { authenticateAccessToken } from '../utils/auth-session'

function getCookieValue(cookieHeader: string | undefined, name: string): string | undefined {
  if (!cookieHeader) return undefined
  const key = `${name}=`
  for (const part of cookieHeader.split(';')) {
    const trimmed = part.trim()
    if (trimmed.startsWith(key)) {
      return decodeURIComponent(trimmed.slice(key.length))
    }
  }
  return undefined
}

declare module 'nitropack' {
  interface NitroApp {
    socketIo?: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  }
}

type NodeHttpServer = InstanceType<typeof HttpServer> | InstanceType<typeof HttpsServer>

type ServerPrototype = {
  listen: (...args: any[]) => unknown
}

type WebSocketPatchState = {
  patchedPrototypes: WeakSet<object>
  initializedServers: WeakSet<NodeHttpServer>
}

declare global {
  var __diaryWebSocketPatchState__: WebSocketPatchState | undefined
}

function isAllowedDevOrigin(origin: string | undefined): boolean {
  if (!origin) return true

  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1'
  } catch {
    return false
  }
}

function getPatchState(): WebSocketPatchState {
  if (!globalThis.__diaryWebSocketPatchState__) {
    globalThis.__diaryWebSocketPatchState__ = {
      patchedPrototypes: new WeakSet<object>(),
      initializedServers: new WeakSet<NodeHttpServer>()
    }
  }

  return globalThis.__diaryWebSocketPatchState__
}

function createSocketServer(
  httpServer: NodeHttpServer
): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const siteUrl = process.env.NUXT_PUBLIC_SITE_URL
  const isProduction = process.env.NODE_ENV === 'production'
  const allowedOrigin = siteUrl || undefined

  if (isProduction && !allowedOrigin) {
    logger.ws.error('NUXT_PUBLIC_SITE_URL not set in production — WebSocket connections will be rejected')
  }

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: (origin, callback) => {
          if (!isProduction && isAllowedDevOrigin(origin)) {
            callback(null, true)
            return
          }

          if (allowedOrigin && origin === allowedOrigin) {
            callback(null, true)
            return
          }

          callback(new Error('Origin not allowed'), false)
        },
        credentials: true,
        methods: ['GET', 'POST']
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      pingInterval: 25000,
      pingTimeout: 20000
    }
  )

  io.use(async (socket, next) => {
    const authToken = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
    const cookieHeader = socket.handshake.headers.cookie
    const cookieToken = getCookieValue(cookieHeader, 'access-token') || getCookieValue(cookieHeader, 'auth-token')
    const token = authToken || cookieToken

    if (!token) {
      logger.ws.warn('Connection rejected: No token provided', { socketId: socket.id })
      return next(new Error('Authentication required'))
    }

    try {
      const user = await authenticateAccessToken(token)
      if (!user) {
        logger.ws.warn('Connection rejected: user not found or token revoked', { socketId: socket.id })
        return next(new Error('Invalid token'))
      }

      socket.data = {
        userId: user.id,
        connectedAt: new Date()
      }

      logger.ws.info('User authenticated', { userId: user.id, socketId: socket.id })
      next()
    } catch (err: any) {
      logger.ws.warn('Token verification failed', { error: err.message, socketId: socket.id })
      next(new Error('Invalid token'))
    }
  })

  io.on('connection', (socket) => {
    const { userId } = socket.data

    logger.ws.info('Client connected', { socketId: socket.id, userId })
    connectionManager.register(userId, socket)
    setupAlertHandlers(socket)
    socket.join(`user:${userId}`)

    socket.emit('connection:success', {
      socketId: socket.id,
      userId
    })

    socket.on('ping', () => {
      socket.emit('pong')
    })

    socket.on('disconnect', (reason) => {
      logger.ws.info('Client disconnected', { socketId: socket.id, userId, reason })
      connectionManager.unregister(socket.id)
      socket.leave(`user:${userId}`)
    })

    socket.on('error', (err) => {
      logger.ws.error('Socket error', { socketId: socket.id, userId, error: err })
    })
  })

  return io
}

function initializeSocketServer(nitroApp: NitroApp, httpServer: NodeHttpServer) {
  const patchState = getPatchState()

  if (nitroApp.socketIo || patchState.initializedServers.has(httpServer)) {
    return
  }

  nitroApp.socketIo = createSocketServer(httpServer)
  patchState.initializedServers.add(httpServer)
  logger.ws.info('Socket.io server initialized')
}

function patchServerPrototype(nitroApp: NitroApp, prototype: ServerPrototype) {
  const patchState = getPatchState()

  if (patchState.patchedPrototypes.has(prototype)) {
    return
  }

  const originalListen = prototype.listen

  prototype.listen = function patchedListen(this: NodeHttpServer, ...args: any[]) {
    initializeSocketServer(nitroApp, this)
    return originalListen.apply(this, args)
  }

  patchState.patchedPrototypes.add(prototype)
}

export default defineNitroPlugin((nitroApp: NitroApp) => {
  patchServerPrototype(nitroApp, HttpServer.prototype)
  patchServerPrototype(nitroApp, HttpsServer.prototype)

  nitroApp.hooks.hook('close', async () => {
    await nitroApp.socketIo?.close()
    nitroApp.socketIo = undefined
  })
})
