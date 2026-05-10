import { cleanupExpiredTelegramData } from '~/server/utils/telegram-db'

/**
 * Periodically clean up expired Telegram sessions and consumed/expired
 * verification codes to prevent unbounded table growth.
 *
 * Runs once on startup, then every 6 hours.
 * Follows the SCHEDULER_ENABLED convention to avoid duplicate runs in
 * multi-instance deployments.
 */
export default defineNitroPlugin(() => {
  if (process.env.SCHEDULER_ENABLED !== 'true') {
    return
  }

  const CLEANUP_INTERVAL_MS = 6 * 60 * 60 * 1000 // 6 hours

  async function run() {
    try {
      const result = await cleanupExpiredTelegramData()
      if (result.sessions > 0 || result.codes > 0) {
        console.log(
          `[TelegramCleanup] Deleted ${result.sessions} expired sessions, ${result.codes} stale verification codes`
        )
      }
    } catch (error) {
      console.error('[TelegramCleanup] Cleanup failed:', error)
    }
  }

  // Run once at startup
  run()

  // Schedule periodic cleanup
  setInterval(run, CLEANUP_INTERVAL_MS)
})
