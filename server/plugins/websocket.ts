import { Server } from 'socket.io'
import type { NitroApp } from 'nitropack'
import { verifyToken } from '../../lib/jwt'
import { connectionManager } from '../websocket/connectionManager'
import { setupAlertHandlers } from '../websocket/alertHandler'
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/websocket'

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
}

// 擴充 h3 App 類型
declare module 'h3' {
  interface App {
    server?: any
  }
}

export default defineNitroPlugin((nitroApp: NitroApp) => {
  // 使用 Nitro 的 rendered hook 確保 HTTP server 已準備好
  // 這比 setImmediate 更可靠，因為它保證在 server 完全初始化後執行
  nitroApp.hooks.hook('rendered', () => {
    // 只初始化一次
    if (nitroApp.socketIo) {
      return
    }

    // @ts-expect-error - 動態存取內部 server
    const httpServer = nitroApp.h3App?.server || nitroApp.h3App?.node?.server

    if (!httpServer) {
      console.warn('[WS] HTTP server not available, WebSocket will not be initialized')
      return
    }

    // 建立 Socket.io Server
    const io = new Server<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>(
      httpServer,
      {
        cors: {
          origin: process.env.NUXT_PUBLIC_SITE_URL || '*',
          credentials: true,
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
        console.warn(`[WS] Connection rejected: No token provided (socket: ${socket.id})`)
        return next(new Error('Authentication required'))
      }

      try {
        const payload = await verifyToken(token)

        // 只接受 access token
        if (payload.type !== 'access') {
          return next(new Error('Invalid token type'))
        }

        // 將用戶資訊存入 socket.data
        socket.data = {
          userId: payload.userId,
          connectedAt: new Date()
        }

        console.log(`[WS] User ${payload.userId} authenticated (socket: ${socket.id})`)
        next()
      } catch (err: any) {
        console.warn(`[WS] Token verification failed: ${err.message} (socket: ${socket.id})`)
        next(new Error('Invalid token'))
      }
    })

    // 連線處理
    io.on('connection', (socket) => {
      const { userId } = socket.data

      console.log(`[WS] Client connected: ${socket.id} (user: ${userId})`)

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
        console.log(`[WS] Client disconnected: ${socket.id} (user: ${userId}, reason: ${reason})`)
        connectionManager.unregister(socket.id)
        socket.leave(`user:${userId}`)
      })

      // 處理錯誤
      socket.on('error', (err) => {
        console.error(`[WS] Socket error: ${socket.id} (user: ${userId})`, err)
      })
    })

    // 將 io 實例掛載到 nitroApp 供其他模組使用
    nitroApp.socketIo = io

    console.log('[WS] Socket.io server initialized')
  })
})
