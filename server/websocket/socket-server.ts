import { Server } from 'socket.io'
import { Server as HttpServer } from 'node:http'
import { Server as HttpsServer } from 'node:https'
import { formatErrorContext, logger } from '~/lib/logger'
import { connectionManager } from './connectionManager'
import { setupAlertHandlers } from './alertHandler'
import { isAllowedWebSocketOrigin } from '../utils/websocket-origin'
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/websocket'
import { authenticateWebSocketAccessToken } from '../utils/auth-session'
import { parseRuntimeSettings } from '~/server/config/env'
import { parseBearerToken } from '../utils/bearer'

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

function getHandshakeToken(socket: {
  handshake: {
    auth: Record<string, unknown>
    headers: { authorization?: string; cookie?: string }
  }
}): string | undefined {
  const authToken = typeof socket.handshake.auth.token === 'string'
    ? socket.handshake.auth.token
    : undefined
  const authorization = socket.handshake.headers.authorization

  if (authToken !== undefined && authorization !== undefined) {
    throw new Error('Ambiguous credentials')
  }
  if (authToken !== undefined) return authToken || undefined
  if (authorization !== undefined) {
    const headerToken = parseBearerToken(authorization)
    if (!headerToken) throw new Error('Invalid authorization header')
    return headerToken
  }

  return getCookieValue(socket.handshake.headers.cookie, 'access-token')
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
    try {
      const token = getHandshakeToken(socket)
      if (!token) {
        logger.ws.warn('Connection rejected: No token provided', { socketId: socket.id })
        next(new Error('Authentication required'))
        return
      }

      const session = await authenticateWebSocketAccessToken(token)
      if (!session) {
        logger.ws.warn('Connection rejected: user not found or token revoked', { socketId: socket.id })
        next(new Error('Invalid token'))
        return
      }

      socket.data = {
        userId: session.user.id,
        accessToken: token,
        expiresAt: session.expiresAt,
        tokenVersion: session.tokenVersion,
        connectedAt: new Date(),
      }

      if (!connectionManager.isSessionCurrent(session.user.id, session.tokenVersion)) {
        next(new Error('Invalid token'))
        return
      }

      logger.ws.info('User authenticated', { userId: session.user.id, socketId: socket.id })
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
    if (!connectionManager.register(userId, socket)) return
    setupAlertHandlers(socket)
    socket.join(`user:${userId}`)

    socket.emit('connection:success', {
      socketId: socket.id,
      userId,
    })

    const expiryTimer = setTimeout(() => {
      logger.ws.info('Access token expired; disconnecting WebSocket', { socketId: socket.id, userId })
      socket.disconnect(true)
    }, Math.max(0, socket.data.expiresAt.getTime() - Date.now()))

    socket.on('ping', () => {
      socket.emit('pong')
    })

    socket.on('disconnect', (reason) => {
      clearTimeout(expiryTimer)
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
