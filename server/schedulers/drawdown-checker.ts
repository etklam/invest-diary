import type { DrawdownCheckConfig, DrawdownCheckResult } from '~/server/utils/drawdown-alerts'

// ─── Dependency interfaces ────────────────────────────────────────────────────

export interface DrawdownCheckerPrisma {
  portfolioSnapshot: {
    findMany: (args: {
      select: { userId: true }
      distinct: ['userId']
    }) => Promise<Array<{ userId: bigint }>>
  }
}

export interface DrawdownCheckerBroadcaster {
  isUserConnected: (userId: string) => boolean
  emitToUser: (userId: string, event: string, data: unknown) => boolean
}

export interface DrawdownCheckerLogger {
  info: (message: string) => void
  error: (message: string, ...args: unknown[]) => void
}

export interface DrawdownCheckerDeps {
  prisma: DrawdownCheckerPrisma
  broadcaster: DrawdownCheckerBroadcaster
  logger: DrawdownCheckerLogger
  checkDrawdown: (config: DrawdownCheckConfig) => Promise<DrawdownCheckResult>
  drawdownThreshold?: number
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const DRAWDOWN_CHECK_INTERVAL = 5 * 60000 // 每 5 分鐘檢查一次回撤（不需太頻繁）
const DEFAULT_DRAWDOWN_THRESHOLD = 10 // 預設回撤警報閾值 10%

// ─── Factory ───────────────────────────────────────────────────────────────────

/**
 * 建立投資組合回撤檢查排程器
 *
 * 檢查所有有 PortfolioSnapshot 的用戶的回撤狀態，超過閾值則透過 WebSocket 推播。
 * 完全依賴注入，可獨立測試。
 */
export function createDrawdownChecker(deps: DrawdownCheckerDeps) {
  const TAG = '[AlertScheduler]'
  const thresholdPct = deps.drawdownThreshold ?? DEFAULT_DRAWDOWN_THRESHOLD
  let intervalId: ReturnType<typeof setInterval> | null = null

  /**
   * 檢查所有有 PortfolioSnapshot 的用戶的回撤狀態，超過閾值則透過 WebSocket 推播
   */
  const checkDrawdownAlerts = async () => {
    try {
      // 找出所有曾經有過 portfolio snapshot 的 userId（去重）
      const snapshotUsers = await deps.prisma.portfolioSnapshot.findMany({
        select: { userId: true },
        distinct: ['userId'],
      })

      if (snapshotUsers.length === 0) {
        deps.logger.info(`${TAG} No users with portfolio snapshots for drawdown check`)
        return
      }

      deps.logger.info(`${TAG} Checking drawdown for ${snapshotUsers.length} users`)

      for (const { userId } of snapshotUsers) {
        try {
          const userIdStr = userId.toString()

          // 只有用戶在線時才推播（避免不必要的 DB 查詢）
          if (!deps.broadcaster.isUserConnected(userIdStr)) {
            continue
          }

          const result = await deps.checkDrawdown({
            userId,
            thresholdPct,
          })

          if (result.hasAlert && result.payload) {
            const pushed = deps.broadcaster.emitToUser(
              userIdStr,
              'drawdown:alert',
              result.payload,
            )

            if (pushed) {
              deps.logger.info(
                `${TAG} Pushed drawdown alert to user ${userIdStr} (drawdown: ${result.payload.drawdownPct}%)`
              )
            }
          }
        } catch (error) {
          // 單一用戶檢查失敗不影響其他用戶
          deps.logger.error(
            `${TAG} Failed to check drawdown for user ${userId}:`,
            error,
          )
        }
      }
    } catch (error) {
      deps.logger.error(`${TAG} Error checking drawdown alerts:`, error)
    }
  }

  const start = () => {
    // 啟動時立即執行一次
    checkDrawdownAlerts()
    intervalId = setInterval(checkDrawdownAlerts, DRAWDOWN_CHECK_INTERVAL)
  }

  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return { start, stop }
}
