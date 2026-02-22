import type { Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/websocket'
import prisma from '../../lib/prisma'

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
      // 驗證 alert 是否屬於該用戶
      const alert = await prisma.alert.findFirst({
        where: {
          id: BigInt(alertId),
          diary: {
            userId: BigInt(userId)
          }
        },
        include: {
          diary: {
            select: { userId: true }
          }
        }
      })

      if (!alert) {
        socket.emit('alert:error', {
          message: 'Alert not found or not authorized',
          alertId
        })
        return
      }

      // 更新 alert 狀態
      await prisma.alert.update({
        where: { id: BigInt(alertId) },
        data: { isDismissed: true }
      })

      // 通知客戶端成功
      socket.emit('alert:dismissed', { alertId })
      
      console.log(`[WS] Alert ${alertId} dismissed by user ${userId}`)
    } catch (error: any) {
      console.error(`[WS] Error dismissing alert ${alertId}:`, error)
      
      socket.emit('alert:error', {
        message: 'Failed to dismiss alert',
        alertId
      })
    }
  })
}
