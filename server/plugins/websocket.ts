import { Server } from 'socket.io'
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

// 擴充 NitroApp 類型以包含 socketIo
declare module 'nitropack' {
  interface NitroApp {
    socketIo?: Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>
  }

  interface NitroRuntimeHooks {
    rendered: () => void | Promise<void>
  }
}

// 擴充 h3 App 類型
declare module 'h3' {
  interface App {
    server?: any
  }
}

export default defineNitroPlugin((nitroApp: NitroApp) => {
  // Wait until Nitro finishes rendering setup so the underlying HTTP server
  // is attached before Socket.IO binds listeners.
  nitroApp.hooks.hook('rendered', () => {
    // 只初始化一次
    if (nitroApp.socketIo) {
      return
    }

    // @ts-expect-error - 動態存取內部 server
    const httpServer = nitroApp.h3App?.server || nitroApp.h3App?.node?.server

    if (!httpServer) {
      logger.ws.warn('HTTP server not available, WebSocket will not be initialized')
      return
    }

    // 建立 Socket.io Server
    const siteUrl = process.env.NUXT_PUBLIC_SITE_URL
    // Fail closed: production requires explicit siteUrl, dev defaults to localhost
    const allowedOrigin = siteUrl
      || (process.env.NODE_ENV === 'production'
        ? undefined
        : 'http://localhost:3000')

    if (!allowedOrigin) {
      logger.ws.error('NUXT_PUBLIC_SITE_URL not set in production — WebSocket connections will be rejected')
    }

    const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
      httpServer,
      {
        cors: {
          origin: allowedOrigin ?? '',
          credentials: !!allowedOrigin,
          methods: ['GET', 'POST']
        },
        path: '/socket.io/',
        // 傳輸方式優先使用 WebSocket
        transports: ['websocket', 'polling'],
        // Ping 間隔（用於檢測連線是否存活）
        pingInterval: 25000,
        pingTimeout: 20000
      }
    )

    // 認證中間件
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

        // 將用戶資訊存入 socket.data
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

    // 連線處理
    io.on('connection', (socket) => {
      const { userId } = socket.data

      logger.ws.info('Client connected', { socketId: socket.id, userId })

      // 註冊連線
      connectionManager.register(userId, socket)

      // 設定 Alert 處理器
      setupAlertHandlers(socket)

      // 加入用戶專屬 room（方便廣播）
      socket.join(`user:${userId}`)

      // 回應連線成功
      socket.emit('connection:success', {
        socketId: socket.id,
        userId
      })

      // 處理 ping（心跳檢測）
      socket.on('ping', () => {
        socket.emit('pong')
      })

      // 處理斷線
      socket.on('disconnect', (reason) => {
        logger.ws.info('Client disconnected', { socketId: socket.id, userId, reason })
        connectionManager.unregister(socket.id)
        socket.leave(`user:${userId}`)
      })

      // 處理錯誤
      socket.on('error', (err) => {
        logger.ws.error('Socket error', { socketId: socket.id, userId, error: err })
      })
    })

    // 將 io 實例掛載到 nitroApp 供其他模組使用
    nitroApp.socketIo = io

    logger.ws.info('Socket.io server initialized')
  })
})
