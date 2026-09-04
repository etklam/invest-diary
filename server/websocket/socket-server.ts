import { Server } from 'socket.io'
import { Server as HttpServer } from 'node:http'
import { Server as HttpsServer } from 'node:https'
import { formatErrorContext, logger } from '~/lib/logger'
import { connectionManager } from './connectionManager'
import { setupAlertHandlers } from './alertHandler'
import { isAllowedWebSocketOrigin } from '../utils/websocket-origin'
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/websocket'
import { authenticateAccessToken } from '../utils/auth-session'
import { parseRuntimeSettings } from '~/server/config/env'

type NodeHttpServer = InstanceType<typeof HttpServer> | InstanceType<typeof HttpsServer>

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

/**
 * Build the real Socket.IO server used by the Nitro bootstrap plugin.
 * Keeping construction in a small exported boundary lets integration tests
 * exercise the actual handshake, auth middleware, rooms and event wire.
 */
export function createSocketServer(
  httpServer: NodeHttpServer,
): Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData> {
  const runtime = parseRuntimeSettings()
  const siteUrl = runtime.publicSiteUrl
  const isProduction = runtime.nodeEnv === 'production'
  const allowedOrigin = siteUrl || undefined

  if (isProduction && !allowedOrigin) {
    logger.ws.error('NUXT_PUBLIC_SITE_URL not set in production — WebSocket connections will be rejected')
  }

  const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
    httpServer,
    {
      cors: {
        origin: (origin, callback) => {
          if (isAllowedWebSocketOrigin(origin, allowedOrigin, isProduction)) {
            callback(null, true)
            return
          }

          callback(new Error('Origin not allowed'), false)
        },
        credentials: true,
        methods: ['GET', 'POST'],
      },
      path: '/socket.io/',
      transports: ['websocket', 'polling'],
      pingInterval: 25_000,
      pingTimeout: 20_000,
    },
  )

  io.use(async (socket, next) => {
    const authToken = socket.handshake.auth.token || socket.handshake.headers.authorization?.replace('Bearer ', '')
    const cookieHeader = socket.handshake.headers.cookie
    const cookieToken = getCookieValue(cookieHeader, 'access-token')
    const token = authToken || cookieToken

    if (!token) {
      logger.ws.warn('Connection rejected: No token provided', { socketId: socket.id })
      next(new Error('Authentication required'))
      return
    }

    try {
      const user = await authenticateAccessToken(token)
      if (!user) {
        logger.ws.warn('Connection rejected: user not found or token revoked', { socketId: socket.id })
        next(new Error('Invalid token'))
        return
      }

      socket.data = {
        userId: user.id,
        connectedAt: new Date(),
      }

      logger.ws.info('User authenticated', { userId: user.id, socketId: socket.id })
      next()
    }
    catch (error: unknown) {
      logger.ws.warn('Token verification failed', {
        socketId: socket.id,
        ...formatErrorContext(error),
      })
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
      userId,
    })

    socket.on('ping', () => {
      socket.emit('pong')
    })

    socket.on('disconnect', (reason) => {
      logger.ws.info('Client disconnected', { socketId: socket.id, userId, reason })
      connectionManager.unregister(socket.id)
      socket.leave(`user:${userId}`)
    })

    socket.on('error', (error: unknown) => {
      logger.ws.error('Socket error', {
        socketId: socket.id,
        userId,
        ...formatErrorContext(error),
      })
    })
  })

  return io
}
