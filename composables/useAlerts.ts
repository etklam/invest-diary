import { ref, computed, onUnmounted } from 'vue'

export interface AlertItem {
  id: string | number
  message: string
  trigger_at: string
  is_dismissed: boolean
}

const BASE_POLL_INTERVAL = 30000
const MAX_POLL_INTERVAL = 300000
const BACKOFF_MULTIPLIER = 1.5

export const useAlerts = () => {
  const alertQueue = ref<AlertItem[]>([])
  const currentAlert = ref<AlertItem | null>(null)
  const showAlert = ref(false)

  const processedAlerts = ref<Set<string>>(new Set())

  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let currentPollInterval = BASE_POLL_INTERVAL
  let lastResetDate = new Date().toDateString()

  const hasNextAlert = computed(() => alertQueue.value.length > 0)

  const checkDailyReset = () => {
    const today = new Date().toDateString()
    if (today !== lastResetDate) {
      lastResetDate = today
      currentPollInterval = BASE_POLL_INTERVAL
    }
  }

  const scheduleNextPoll = (fn: () => Promise<void>) => {
    if (pollTimer) clearTimeout(pollTimer)
    pollTimer = setTimeout(fn, currentPollInterval)
  }

  const applyBackoff = (fn: () => Promise<void>) => {
    currentPollInterval = Math.min(
      currentPollInterval * BACKOFF_MULTIPLIER,
      MAX_POLL_INTERVAL
    )
    scheduleNextPoll(fn)
  }

  const enqueueAlerts = (alerts: AlertItem[]) => {
    const now = new Date()
    alerts.forEach(alert => {
      const triggerTime = new Date(alert.trigger_at)
      const key = alert.id.toString()

      if (
        triggerTime <= now &&
        !alert.is_dismissed &&
        !processedAlerts.value.has(key)
      ) {
        processedAlerts.value.add(key)
        alertQueue.value.push(alert)
      }
    })

    if (!currentAlert.value && alertQueue.value.length > 0) {
      showNextAlert()
    }
  }

  const showNextAlert = () => {
    currentAlert.value = alertQueue.value.shift() || null
    showAlert.value = !!currentAlert.value
  }

  const dismissCurrentAlert = async () => {
    if (!currentAlert.value) return

    const alert = currentAlert.value
    showAlert.value = false

    try {
      await $fetch(`/api/alerts/${alert.id}/dismiss`, { method: 'PUT' })
    } catch (e) {
      console.error('dismiss alert failed', e)
    }

    currentAlert.value = null

    if (alertQueue.value.length > 0) {
      showNextAlert()
    }
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  onUnmounted(stopPolling)

  return {
    currentAlert,
    showAlert,
    hasNextAlert,
    enqueueAlerts,
    dismissCurrentAlert,
    stopPolling,
    applyBackoff,
    scheduleNextPoll,
    checkDailyReset,
    setBaseInterval: () => (currentPollInterval = BASE_POLL_INTERVAL)
  }
}
