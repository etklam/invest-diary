import { clearExpired, getCacheSize } from '~/lib/market-data/cache'
import { getServerEnv, parseRuntimeSettings } from '~/server/config/env'
import { formatErrorContext, logger } from '~/lib/logger'

/**
 * ETF 快取清理器
 * 清理過期的 ETF 資料快取
 *
 * 多實例環境安全：只有當 SCHEDULER_ENABLED=true 時才啟動排程
 * 在 CapRover 等環境中，只對主實例設置此環境變量以避免重複執行
 */
export default defineNitroPlugin((nitroApp) => {
  // 檢查是否啟用排程（預防多實例重複執行）
  if (!getServerEnv().schedulerEnabled) {
    logger.etf.info('ETF cache cleaner disabled', {
      operation: 'etf_cache_cleaner_start',
      schedulerEnabled: false,
    })
    return
  }

  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

  const runCleanup = () => {
    try {
      clearExpired()
    } catch (error) {
      logger.etf.error('ETF cache cleanup failed', {
        operation: 'etf_cache_cleanup',
        ...formatErrorContext(error),
      })
    }
  }

  runCleanup()
  const timer = setInterval(runCleanup, CLEANUP_INTERVAL_MS)

  nitroApp.hooks.hook('close', () => {
    clearInterval(timer)
  })

  if (parseRuntimeSettings().nodeEnv !== 'production') {
    logger.etf.info('ETF cache cleaner started', {
      operation: 'etf_cache_cleaner_start',
      intervalMs: CLEANUP_INTERVAL_MS,
      cacheSize: getCacheSize(),
    })
  }
})
