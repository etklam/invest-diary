import prisma from '~/lib/prisma'
import { connectionManager } from '~/server/websocket/connectionManager'
import type { AlertPayload } from '~/types/websocket'

/**
 * Alert 推播排程器
 * 取代原本的 alerts-checker.ts，改用 WebSocket 即時推播
 *
 * 多實例環境安全：只有當 SCHEDULER_ENABLED=true 時才啟動排程
 * 在 CapRover 等環境中，只對主實例設置此環境變量以避免重複執行
 */
export default defineNitroPlugin(() => {
  // 檢查是否啟用排程（預防多實例重複執行）
  if (process.env.SCHEDULER_ENABLED !== 'true') {
    console.log('[AlertScheduler] Scheduler disabled (SCHEDULER_ENABLED is not set to "true")')
    return
  }

  const CHECK_INTERVAL = 60000 // 每分鐘檢查一次
  const BUFFER_WINDOW = 5000 // 5 秒緩衝視窗，防止邊界 alerts 被漏掉

  /**
   * 檢查並推播即將觸發的 alerts
   */
  const checkAndPushAlerts = async () => {
    try {
      const now = new Date()
      // 查詢未來 1 分鐘 + 5 秒緩衝內會觸發的 alerts（防止間隔邊界漏掉）
      const oneMinuteLater = new Date(now.getTime() + CHECK_INTERVAL + BUFFER_WINDOW)

      const alerts = await prisma.alert.findMany({
        where: {
          isDismissed: false,
          triggerAt: {
            gte: now,
            lt: oneMinuteLater
          }
        },
        include: {
          diary: {
            select: {
              id: true,
              title: true,
              userId: true
            }
          }
        }
      })

      if (alerts.length === 0) {
        return
      }

      console.log(`[AlertScheduler] Found ${alerts.length} alerts to push`)

      for (const alert of alerts) {
        try {
          const userId = alert.diary.userId.toString()

          // 檢查用戶是否在線
          if (connectionManager.isUserConnected(userId)) {
            // 構建推播 payload
            const payload: AlertPayload = {
              id: alert.id.toString(),
              message: alert.message,
              triggerAt: alert.triggerAt.toISOString(),
              diary: {
                id: alert.diary.id.toString(),
                title: alert.diary.title
              }
            }

            // 即時推播
            const pushed = connectionManager.emitToUser(userId, 'alert:triggered', payload)

            if (pushed) {
              console.log(`[AlertScheduler] Pushed alert ${alert.id} to user ${userId}`)
            }
          } else {
            console.log(`[AlertScheduler] User ${userId} is offline, alert ${alert.id} will be fetched via HTTP`)
          }
        } catch (error) {
          // 單一 alert 推播失敗不應影響其他 alerts
          console.error(`[AlertScheduler] Failed to push alert ${alert.id}:`, error)
        }
      }
    } catch (error) {
      console.error('[AlertScheduler] Error checking alerts:', error)
    }
  }

  // 啟動時立即執行一次
  checkAndPushAlerts()
  
  // 設定定時任務
  const intervalId = setInterval(checkAndPushAlerts, CHECK_INTERVAL)
  
  console.log('[AlertScheduler] Started with interval', CHECK_INTERVAL, 'ms')

  // 清理函數（雖然 Nitro plugin 通常不會被卸載）
  if (typeof process !== 'undefined') {
    process.on('SIGTERM', () => {
      clearInterval(intervalId)
      console.log('[AlertScheduler] Stopped')
    })
  }
})
