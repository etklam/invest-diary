import { clearExpired, getCacheSize } from '~/lib/market-data/cache'

/**
 * ETF 快取清理器
 * 清理過期的 ETF 資料快取
 *
 * 多實例環境安全：只有當 SCHEDULER_ENABLED=true 時才啟動排程
 * 在 CapRover 等環境中，只對主實例設置此環境變量以避免重複執行
 */
export default defineNitroPlugin((nitroApp) => {
  // 檢查是否啟用排程（預防多實例重複執行）
  if (process.env.SCHEDULER_ENABLED !== 'true') {
    console.log('[EtfCacheCleaner] Cleaner disabled (SCHEDULER_ENABLED is not set to "true")')
    return
  }

  const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

  const runCleanup = () => {
    try {
      clearExpired()
    } catch (error) {
      console.error('[EtfCacheCleaner] Failed to clear expired cache entries:', error)
    }
  }

  runCleanup()
  const timer = setInterval(runCleanup, CLEANUP_INTERVAL_MS)

  nitroApp.hooks.hook('close', () => {
    clearInterval(timer)
  })

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[EtfCacheCleaner] Started (interval=${CLEANUP_INTERVAL_MS}ms, size=${getCacheSize()})`)
  }
})
