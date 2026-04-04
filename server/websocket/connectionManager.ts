import type { Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/websocket'

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

/**
 * WebSocket 連線管理器
 * 管理用戶與 Socket 的映射關係，支援多用戶多裝置
 */
class ConnectionManager {
  // userId -> Set<Socket>
  private connections: Map<string, Set<TypedSocket>> = new Map()
  
  // socketId -> userId (反向索引，用於快速查找)
  private socketToUser: Map<string, string> = new Map()

  /**
   * 註冊用戶連線
   */
  register(userId: string, socket: TypedSocket): void {
    const userIdStr = userId.toString()
    
    if (!this.connections.has(userIdStr)) {
      this.connections.set(userIdStr, new Set())
    }
    
    this.connections.get(userIdStr)!.add(socket)
    this.socketToUser.set(socket.id, userIdStr)
    
    console.log(`[WS] User ${userIdStr} connected via socket ${socket.id}. Total sockets for user: ${this.connections.get(userIdStr)!.size}`)
  }

  /**
   * 移除用戶連線
   */
  unregister(socketId: string): void {
    const userId = this.socketToUser.get(socketId)
    
    if (!userId) {
      console.warn(`[WS] Attempted to unregister unknown socket: ${socketId}`)
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
        console.log(`[WS] User ${userId} has no more connections`)
      } else {
        console.log(`[WS] Socket ${socketId} removed for user ${userId}. Remaining: ${userSockets.size}`)
      }
    }
    
    this.socketToUser.delete(socketId)
  }

  /**
   * 推播訊息給特定用戶的所有連線
   * @returns 是否成功推播（用戶是否在線）
   */
  emitToUser(
    userId: string | bigint,
    event: keyof ServerToClientEvents,
    data: any
  ): boolean {
    const userIdStr = userId.toString()
    const userSockets = this.connections.get(userIdStr)
    
    if (!userSockets || userSockets.size === 0) {
      return false
    }
    
    userSockets.forEach(socket => {
      socket.emit(event, data)
    })
    
    console.log(`[WS] Emitted ${event} to user ${userIdStr} (${userSockets.size} sockets)`)
    return true
  }

  /**
   * 推播訊息給所有連線的用戶（廣播）
   */
  broadcast(
    event: keyof ServerToClientEvents,
    data: any
  ): number {
    let recipientCount = 0
    
    this.connections.forEach((sockets) => {
      sockets.forEach(socket => {
        socket.emit(event, data)
        recipientCount++
      })
    })
    
    console.log(`[WS] Broadcast ${event} to ${recipientCount} sockets`)
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
