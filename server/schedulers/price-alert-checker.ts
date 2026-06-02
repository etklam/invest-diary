import type { PriceAlert } from '@prisma/client'
import type { AlertBroadcaster, PriceAlertPayload } from '~/types/websocket'
import type { QuoteResponse } from '~/lib/yahoo-finance'

// ─── Dependency interfaces ────────────────────────────────────────────────────

export interface PriceAlertCheckerPrisma {
  priceAlert: {
    findMany: (args: {
      where: { isTriggered: boolean }
    }) => Promise<PriceAlert[]>
    update: (args: {
      where: { id: bigint }
      data: { isTriggered: boolean; triggeredAt: Date }
    }) => Promise<unknown>
  }
}

export interface PriceAlertCheckerLogger {
  info: (message: string) => void
  error: (message: string, error?: unknown) => void
}

export interface PriceAlertCheckerDeps {
  prisma: PriceAlertCheckerPrisma
  broadcaster: AlertBroadcaster
  logger: PriceAlertCheckerLogger
  fetchQuote: (symbol: string) => Promise<QuoteResponse>
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PRICE_ALERT_CHECK_INTERVAL = 5 * 60000 // 每 5 分鐘檢查一次價格警報

// ─── Factory ───────────────────────────────────────────────────────────────────

/**
 * 建立價格警報檢查排程器
 *
 * 檢查所有未觸發的價格警報，比對當前股價，若條件滿足則透過 WebSocket 推播。
 * 完全依賴注入，可獨立測試。
 */
export function createPriceAlertChecker(deps: PriceAlertCheckerDeps) {
  const TAG = '[AlertScheduler]'
  let intervalId: ReturnType<typeof setInterval> | null = null

  /**
   * 檢查所有未觸發的價格警報，比對當前股價，若條件滿足則透過 WebSocket 推播
   */
  const checkPriceAlerts = async () => {
    try {
      const priceAlerts = await deps.prisma.priceAlert.findMany({
        where: { isTriggered: false },
      })

      if (priceAlerts.length === 0) {
        return
      }

      deps.logger.info(`${TAG} Checking ${priceAlerts.length} price alerts`)

      // 收集所有不重複的 symbol，減少 API 呼叫次數
      const uniqueSymbols: string[] = [...new Set(priceAlerts.map((a: PriceAlert) => a.symbol))]

      // 批次取得所有 symbol 的報價（用 Map 快取）
      const priceCache = new Map<string, number | null>()
      for (const sym of uniqueSymbols) {
        try {
          const quote = await deps.fetchQuote(sym)
          priceCache.set(sym, quote.regularMarketPrice)
        } catch {
          // 報價取得失敗不中斷整個流程
          deps.logger.info(`${TAG} Failed to fetch quote for ${sym}, skipping`)
          priceCache.set(sym, null)
        }
      }

      for (const alert of priceAlerts) {
        try {
          const currentPrice = priceCache.get(alert.symbol)
          if (currentPrice === null || currentPrice === undefined) {
            continue
          }

          const threshold = Number(alert.threshold)
          let isTriggered = false

          switch (alert.type) {
            case 'PRICE_ABOVE':
              isTriggered = currentPrice >= threshold
              break
            case 'PRICE_BELOW':
              isTriggered = currentPrice <= threshold
              break
            case 'CHANGE_PERCENT':
              // TODO: CHANGE_PERCENT 需要 previous close 來計算百分比變動。
              // threshold 值代表要監控的百分比變化量。
              // 目前的簡化方案只快取了價格，需要重新獲取完整報價才能取得 changePercent。
              // 詳細設計：fetchQuote 已回傳 changePercent，因此可復用快取的報價。
              // 為求簡化，暫時跳過 CHANGE_PERCENT，留待後續增強。
              break
            case 'MOVING_AVG':
              // TODO: MOVING_AVG 需要歷史數據計算。
              // 排程器暫時跳過 — 這最好作為獨立功能處理。
              break
          }

          if (!isTriggered) {
            continue
          }

          const now = new Date()

          // Mark as triggered
          await deps.prisma.priceAlert.update({
            where: { id: alert.id },
            data: {
              isTriggered: true,
              triggeredAt: now,
            },
          })

          const userIdStr = alert.userId.toString()

          const payload: PriceAlertPayload = {
            id: alert.id.toString(),
            symbol: alert.symbol,
            type: alert.type,
            threshold,
            currentPrice,
            message: alert.message,
            triggeredAt: now.toISOString(),
          }

          const pushed = deps.broadcaster.emitToUser(
            userIdStr,
            'price-alert:triggered',
            payload,
          )

          if (pushed) {
            deps.logger.info(
              `${TAG} Pushed price alert ${alert.id} (${alert.symbol} ${alert.type} ${threshold}) to user ${userIdStr}`
            )
          } else {
            deps.logger.info(
              `${TAG} User ${userIdStr} is offline, price alert ${alert.id} will be fetched via HTTP`
            )
          }
        } catch (error) {
          // 單一 alert 失敗不影響其他
          deps.logger.error(`${TAG} Failed to process price alert ${alert.id}:`, error)
        }
      }
    } catch (error) {
      deps.logger.error(`${TAG} Error checking price alerts:`, error)
    }
  }

  const start = () => {
    // 啟動時立即執行一次
    checkPriceAlerts()
    intervalId = setInterval(checkPriceAlerts, PRICE_ALERT_CHECK_INTERVAL)
  }

  const stop = () => {
    if (intervalId !== null) {
      clearInterval(intervalId)
      intervalId = null
    }
  }

  return { start, stop }
}
