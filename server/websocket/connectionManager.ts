import type { Socket } from 'socket.io'
import type { AlertBroadcaster, ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/websocket'
import { logger } from '~/lib/logger'
import { ACCESS_TOKEN_MAX_AGE_SECONDS } from '~/lib/jwt'

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

/**
 * WebSocket 連線管理器
 * 管理用戶與 Socket 的映射關係，支援多用戶多裝置
 */
class ConnectionManager implements AlertBroadcaster {
  // userId -> Set<Socket>
  private connections: Map<string, Set<TypedSocket>> = new Map()
  
  // socketId -> userId (反向索引，用於快速查找)
  private socketToUser: Map<string, string> = new Map()

  // Guards handshakes whose DB read began before a committed revocation.
  private minimumTokenVersions: Map<string, number> = new Map()

  private revocationCleanupTimers: Map<string, ReturnType<typeof setTimeout>> = new Map()

  /**
   * 註冊用戶連線
   */
  register(userId: string, socket: TypedSocket): boolean {
    const userIdStr = userId.toString()

    if (!this.isSessionCurrent(userIdStr, socket.data.tokenVersion)) {
      socket.disconnect(true)
      return false
    }
    
    if (!this.connections.has(userIdStr)) {
      this.connections.set(userIdStr, new Set())
    }
    
    this.connections.get(userIdStr)!.add(socket)
    this.socketToUser.set(socket.id, userIdStr)
    
    logger.ws.info('WebSocket user connected', {
      operation: 'websocket_connection_register',
      userId: userIdStr,
      socketId: socket.id,
      userSocketCount: this.connections.get(userIdStr)!.size,
    })
    return true
  }

  isSessionCurrent(userId: string | bigint, tokenVersion: number): boolean {
    return tokenVersion >= (this.minimumTokenVersions.get(userId.toString()) ?? 0)
  }

  /**
   * 移除用戶連線
   */
  unregister(socketId: string): void {
    const userId = this.socketToUser.get(socketId)
    
    if (!userId) {
      logger.ws.warn('Attempted to unregister unknown WebSocket', {
        operation: 'websocket_connection_unregister',
        socketId,
      })
      return
    }
    
    const userSockets = this.connections.get(userId)
    
    if (userSockets) {
      // 找到並移除對應的 socket
      for (const socket of userSockets) {
        if (socket.id === socketId) {
          userSockets.delete(socket)
          break
        }
      }
      
      // 如果用戶沒有任何連線了，移除整個 entry
      if (userSockets.size === 0) {
        this.connections.delete(userId)
        logger.ws.info('WebSocket user disconnected completely', {
          operation: 'websocket_connection_unregister',
          userId,
          socketId,
        })
      } else {
        logger.ws.info('WebSocket socket disconnected', {
          operation: 'websocket_connection_unregister',
          userId,
          socketId,
          remainingSockets: userSockets.size,
        })
      }
    }
    
    this.socketToUser.delete(socketId)
  }

  /** Disconnect every active socket after a user's sessions are revoked. */
  disconnectUser(userId: string | bigint): number {
    const userIdStr = userId.toString()
    const sockets = this.connections.get(userIdStr)
    if (!sockets?.size) return 0

    const activeSockets = [...sockets]
    for (const socket of activeSockets) {
      socket.disconnect(true)
      this.socketToUser.delete(socket.id)
    }
    this.connections.delete(userIdStr)

    logger.ws.info('Revoked user WebSockets disconnected', {
      operation: 'websocket_user_disconnect',
      userId: userIdStr,
      socketCount: activeSockets.length,
    })
    return activeSockets.length
  }

  /** Record a committed session revocation and close every older connection. */
  revokeUser(userId: string | bigint, minimumTokenVersion = Number.MAX_SAFE_INTEGER): number {
    const userIdStr = userId.toString()
    const currentMinimum = this.minimumTokenVersions.get(userIdStr) ?? 0
    this.minimumTokenVersions.set(userIdStr, Math.max(currentMinimum, minimumTokenVersion))

    const existingTimer = this.revocationCleanupTimers.get(userIdStr)
    if (existingTimer) clearTimeout(existingTimer)
    const cleanupTimer = setTimeout(() => {
      this.minimumTokenVersions.delete(userIdStr)
      this.revocationCleanupTimers.delete(userIdStr)
    }, ACCESS_TOKEN_MAX_AGE_SECONDS * 1000)
    cleanupTimer.unref?.()
    this.revocationCleanupTimers.set(userIdStr, cleanupTimer)

    return this.disconnectUser(userIdStr)
  }

  /**
   * 推播訊息給特定用戶的所有連線
   * @returns 是否成功推播（用戶是否在線）
   */
  emitToUser<E extends keyof ServerToClientEvents>(
    userId: string | bigint,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): boolean {
    const userIdStr = userId.toString()
    const userSockets = this.connections.get(userIdStr)
    
    if (!userSockets || userSockets.size === 0) {
      return false
    }
    
    let emittedCount = 0
    for (const socket of [...userSockets]) {
      if (socket.data.expiresAt.getTime() <= Date.now()) {
        socket.disconnect(true)
        if (this.socketToUser.has(socket.id)) this.unregister(socket.id)
        continue
      }
      socket.emit(event, ...args)
      emittedCount++
    }
    
    logger.ws.info('WebSocket event emitted to user', {
      operation: 'websocket_emit',
      userId: userIdStr,
      event,
      socketCount: emittedCount,
    })
    return emittedCount > 0
  }

  /**
   * 推播訊息給所有連線的用戶（廣播）
   */
  broadcast<E extends keyof ServerToClientEvents>(
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): number {
    let recipientCount = 0
    
    this.connections.forEach((sockets) => {
      sockets.forEach(socket => {
        socket.emit(event, ...args)
        recipientCount++
      })
    })
    
    logger.ws.info('WebSocket event broadcast', {
      operation: 'websocket_broadcast',
      event,
      recipientCount,
    })
    return recipientCount
  }

  /**
   * 檢查用戶是否在線
   */
  isUserConnected(userId: string | bigint): boolean {
    const userIdStr = userId.toString()
    const sockets = this.connections.get(userIdStr)
    return sockets !== undefined && sockets.size > 0
  }

  /**
   * 取得用戶的連線數量
   */
  getConnectionCount(userId: string | bigint): number {
    const userIdStr = userId.toString()
    return this.connections.get(userIdStr)?.size ?? 0
  }

  /**
   * 取得總連線數
   */
  getTotalConnections(): number {
    return this.socketToUser.size
  }

  /**
   * 取得在線用戶數
   */
  getOnlineUserCount(): number {
    return this.connections.size
  }

  /**
   * 取得所有在線用戶 ID
   */
  getOnlineUserIds(): string[] {
    return Array.from(this.connections.keys())
  }

  /**
   * 取得連線統計資訊
   */
  getStats(): {
    totalSockets: number
    onlineUsers: number
    avgSocketsPerUser: number
  } {
    const totalSockets = this.socketToUser.size
    const onlineUsers = this.connections.size
    
    return {
      totalSockets,
      onlineUsers,
      avgSocketsPerUser: onlineUsers > 0 ? totalSockets / onlineUsers : 0
    }
  }
}

// 匯出單例實例
export const connectionManager = new ConnectionManager()
