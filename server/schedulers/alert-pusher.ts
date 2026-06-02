import type { AlertBroadcaster, AlertPayload } from '~/types/websocket'

// ─── Dependency interfaces ────────────────────────────────────────────────────

export interface AlertPusherPrisma {
  alert: {
    findMany: (args: {
      where: {
        isDismissed: boolean
        triggerAt: { gte: Date; lt: Date }
      }
      include: {
        diary: {
          select: {
            id: true
            title: true
            userId: true
          }
        }
      }
    }) => Promise<
      Array<{
        id: bigint
        message: string
        triggerAt: Date
        diary: {
          id: bigint
          title: string
          userId: bigint
        }
      }>
    >
  }
}

export interface AlertPusherLogger {
  info: (message: string) => void
  error: (message: string, error?: unknown) => void
}

export interface AlertPusherDeps {
  prisma: AlertPusherPrisma
  broadcaster: AlertBroadcaster
  logger: AlertPusherLogger
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const CHECK_INTERVAL = 60000 // 每分鐘檢查一次
const BUFFER_WINDOW = 5000 // 5 秒緩衝視窗，防止邊界 alerts 被漏掉

// ─── Factory ───────────────────────────────────────────────────────────────────

/**
 * 建立 Alert 推播排程器
 *
 * 負責查詢即將觸發的 diary alerts，並透過 WebSocket 即時推播給在線用戶。
 * 完全依賴注入，可獨立測試。
 */
export function createAlertPusher(deps: AlertPusherDeps) {
  const TAG = '[AlertScheduler]'
  let intervalId: ReturnType<typeof setInterval> | null = null

  /**
   * 檢查並推播即將觸發的 alerts
   */
  const checkAndPushAlerts = async () => {
    try {
      const now = new Date()
      // 查詢未來 1 分鐘 + 5 秒緩衝內會觸發的 alerts（防止間隔邊界漏掉）
      const oneMinuteLater = new Date(now.getTime() + CHECK_INTERVAL + BUFFER_WINDOW)

      const alerts = await deps.prisma.alert.findMany({
        where: {
          isDismissed: false,
          triggerAt: {
            gte: now,
            lt: oneMinuteLater,
          },
        },
        include: {
          diary: {
            select: {
              id: true,
              title: true,
              userId: true,
            },
          },
        },
      })

      if (alerts.length === 0) {
        return
      }

      deps.logger.info(`${TAG} Found ${alerts.length} alerts to push`)

      for (const alert of alerts) {
        try {
          const userId = alert.diary.userId.toString()

          const payload: AlertPayload = {
            id: alert.id.toString(),
            message: alert.message,
            triggerAt: alert.triggerAt.toISOString(),
            diary: {
              id: alert.diary.id.toString(),
              title: alert.diary.title,
            },
          }

          const pushed = deps.broadcaster.emitToUser(userId, 'alert:triggered', payload)

          if (pushed) {
            deps.logger.info(`${TAG} Pushed alert ${alert.id} to user ${userId}`)
          } else {
            deps.logger.info(
              `${TAG} User ${userId} is offline, alert ${alert.id} will be fetched via HTTP`
            )
          }
        } catch (error) {
          // 單一 alert 推播失敗不應影響其他 alerts
          deps.logger.error(`${TAG} Failed to push alert ${alert.id}:`, error)
        }
      }
    } catch (error) {
      deps.logger.error(`${TAG} Error checking alerts:`, error)
    }
  }

  const start = () => {
    // 啟動時立即執行一次
    checkAndPushAlerts()
    intervalId = setInterval(checkAndPushAlerts, CHECK_INTERVAL)
  }

  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return { start, stop }
}
