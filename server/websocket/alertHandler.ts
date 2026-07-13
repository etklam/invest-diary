import type { Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/websocket'
import { dismissAlert } from '~/server/utils/alert-queries'

type TypedSocket = Socket<ClientToServerEvents, ServerToClientEvents, InterServerEvents, SocketData>

/**
 * 設定 Alert 相關的事件處理器
 */
export function setupAlertHandlers(socket: TypedSocket): void {
  const { userId } = socket.data

  /**
   * 處理客戶端關閉 alert
   */
  socket.on('alert:dismiss', async (alertId: string) => {
    console.log(`[WS] User ${userId} dismissing alert ${alertId}`)

    try {
      await dismissAlert(alertId, BigInt(userId))

      // 通知客戶端成功
      socket.emit('alert:dismissed', { alertId })
      
      console.log(`[WS] Alert ${alertId} dismissed by user ${userId}`)
    } catch (error: any) {
      console.error(`[WS] Error dismissing alert ${alertId}:`, error)

      socket.emit('alert:error', {
        message: error?.statusCode === 404
          ? 'Alert not found or not authorized'
          : 'Failed to dismiss alert',
        alertId
      })
    }
  })
}
