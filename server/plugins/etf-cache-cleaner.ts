import { clearExpired, getCacheSize } from '~/lib/etf-profile/cache'

export default defineNitroPlugin((nitroApp) => {
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
