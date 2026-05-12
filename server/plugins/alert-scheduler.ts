import prisma from '~/lib/prisma'
import { connectionManager } from '~/server/websocket/connectionManager'
import { checkDrawdown } from '~/server/utils/drawdown-alerts'
import { fetchQuote } from '~/lib/yahoo-finance'
import { logger } from '~/lib/logger'
import { createAlertPusher } from '~/server/schedulers/alert-pusher'
import { createDrawdownChecker } from '~/server/schedulers/drawdown-checker'
import { createPriceAlertChecker } from '~/server/schedulers/price-alert-checker'

/**
 * Alert 排程器組合 Plugin
 *
 * 將三個獨立的排程器（alert-pusher、drawdown-checker、price-alert-checker）
 * 組裝為一個 Nitro plugin。
 *
 * 多實例環境安全：只有當 SCHEDULER_ENABLED=true 時才啟動排程
 * 在 CapRover 等環境中，只對主實例設置此環境變量以避免重複執行
 */
export default defineNitroPlugin(() => {
  if (process.env.SCHEDULER_ENABLED !== 'true') {
    console.log(
      '[AlertScheduler] Scheduler disabled (SCHEDULER_ENABLED is not set to "true")'
    )
    return
  }

  const schedulerLogger = {
    info: (msg: string) => logger.alert.info(msg),
    error: (msg: string, ...args: unknown[]) => logger.alert.error(msg, ...args),
  }

  const alertPusher = createAlertPusher({
    prisma,
    broadcaster: connectionManager,
    logger: schedulerLogger,
  })

  const drawdownChecker = createDrawdownChecker({
    prisma,
    broadcaster: connectionManager,
    logger: schedulerLogger,
    checkDrawdown,
  })

  const priceAlertChecker = createPriceAlertChecker({
    prisma,
    broadcaster: connectionManager,
    logger: schedulerLogger,
    fetchQuote,
  })

  alertPusher.start()
  drawdownChecker.start()
  priceAlertChecker.start()

  console.log(
    '[AlertScheduler] Started — alert pusher (every 60s), drawdown checker (every 5min), price alert checker (every 5min)'
  )

  // 清理函數（雖然 Nitro plugin 通常不會被卸載）
  if (typeof process !== 'undefined') {
    process.on('SIGTERM', () => {
      alertPusher.stop()
      drawdownChecker.stop()
      priceAlertChecker.stop()
      console.log('[AlertScheduler] Stopped')
    })
  }
})
