import prisma from '~/lib/prisma'
import { connectionManager } from '~/server/websocket/connectionManager'
import { formatErrorContext, logger } from '~/lib/logger'
import { createAlertPusher } from '~/server/schedulers/alert-pusher'
import { createPriceAlertChecker } from '~/server/schedulers/price-alert-checker'
import { getCachedQuote } from '~/lib/market-data/quote'
import { getServerEnv } from '~/server/config/env'

/**
 * Alert 排程器組合 Plugin
 *
 * 將兩個獨立的排程器（alert-pusher、price-alert-checker）
 * 組裝為一個 Nitro plugin。
 *
 * 多實例環境安全：只有當 SCHEDULER_ENABLED=true 時才啟動排程
 * 在 CapRover 等環境中，只對主實例設置此環境變量以避免重複執行
 */
export default defineNitroPlugin(() => {
  const env = getServerEnv()

  if (!env.schedulerEnabled) {
    logger.alert.info('Alert scheduler disabled', {
      operation: 'scheduler_start',
      schedulerEnabled: false,
    })
    return
  }

  const schedulerLogger = {
    info: (msg: string) => logger.alert.info(msg),
    error: (msg: string, error?: unknown, context?: Record<string, unknown>) => logger.alert.error(msg, {
      operation: 'scheduler',
      ...context,
      ...formatErrorContext(error),
    }),
  }

  const alertPusher = createAlertPusher({
    prisma,
    broadcaster: connectionManager,
    logger: schedulerLogger,
  })

  const priceAlertChecker = createPriceAlertChecker({
    prisma,
    broadcaster: connectionManager,
    logger: schedulerLogger,
    fetchQuote: (symbol: string) => getCachedQuote(symbol),
  })

  alertPusher.start()
  priceAlertChecker.start()

  logger.alert.info('Alert scheduler started', {
    operation: 'scheduler_start',
    alertIntervalMs: 60_000,
    priceAlertIntervalMs: 5 * 60_000,
  })

  // 清理函數（雖然 Nitro plugin 通常不會被卸載）
  if (typeof process !== 'undefined') {
    process.on('SIGTERM', () => {
      alertPusher.stop()
      priceAlertChecker.stop()
      logger.alert.info('Alert scheduler stopped', { operation: 'scheduler_stop' })
    })
  }
})
