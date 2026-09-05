import type { Socket } from 'socket.io'
import type { ServerToClientEvents, ClientToServerEvents, InterServerEvents, SocketData } from '../../types/websocket'
import { dismissAlert } from '~/server/utils/alert-queries'
import { formatErrorContext, logger } from '~/lib/logger'
import { authenticateAccessToken } from '~/server/utils/auth-session'

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
    logger.ws.info('WebSocket alert dismiss requested', {
      operation: 'websocket_alert_dismiss',
      userId,
      alertId,
    })

    let user
    try {
      user = await authenticateAccessToken(socket.data.accessToken)
    } catch (error) {
      logger.ws.warn('WebSocket authorization failed', {
        operation: 'websocket_alert_authorize',
        userId,
        socketId: socket.id,
        ...formatErrorContext(error),
      })
      socket.disconnect(true)
      return
    }

    if (!user || user.id !== userId || !socket.connected) {
      socket.disconnect(true)
      return
    }

    try {
      await dismissAlert(alertId, BigInt(userId))

      // 通知客戶端成功
      socket.emit('alert:dismissed', { alertId })
      
      logger.ws.info('WebSocket alert dismissed', {
        operation: 'websocket_alert_dismiss',
        userId,
        alertId,
      })
    } catch (error: unknown) {
      logger.ws.error('WebSocket alert dismiss failed', {
        operation: 'websocket_alert_dismiss',
        userId,
        alertId,
        ...formatErrorContext(error),
      })

      socket.emit('alert:error', {
        message: (error as { statusCode?: unknown })?.statusCode === 404
          ? 'Alert not found or not authorized'
          : 'Failed to dismiss alert',
        alertId
      })
    }
  })
}
