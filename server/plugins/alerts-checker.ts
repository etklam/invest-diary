import prisma from '../../lib/prisma'

export default defineNitroPlugin((nitroApp) => {
  // Run every minute
  const cronTask = async () => {
    try {
      const now = new Date()
      
      // Find alerts that need to be triggered
      // In a real app, we might send emails or push notifications here
      // For this app, we just log them as "triggered" (or we could update a status)
      // Since the requirement is just to show them in the app, we don't need to do much here
      // unless we want to mark them as "notified" to avoid repeated notifications
      
      // For now, we'll just log active alerts for debugging purposes
      const activeAlerts = await prisma.alert.findMany({
        where: {
          isDismissed: false,
          triggerAt: {
            lte: now,
          },
        },
      })
      
      if (activeAlerts.length > 0) {
        console.log(`[Alert Checker] Found ${activeAlerts.length} active alerts`)
        // Here we could implement notification logic (email, etc.)
      }
    } catch (error) {
      console.error('[Alert Checker] Error checking alerts:', error)
    }
  }

  // Run immediately on startup
  cronTask()

  // Schedule to run every minute
  // Note: Nitro's experimental cron feature might be needed for proper scheduling,
  // but for a simple implementation, setInterval works for a long-running server process
  setInterval(cronTask, 60 * 1000)
})
