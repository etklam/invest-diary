import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import type { AlertPayload } from '../types/websocket'
import { useAuthRecovery } from '~/composables/useAuthRecovery'

export interface AlertItem {
  id: string
  message: string
  trigger_at: string
  is_dismissed: boolean
  diary?: {
    id: string
    title: string
  }
}

interface AlertApiResponse {
  id: string
  message: string
  triggerAt: string
  isDismissed: boolean
  diary?: {
    id: string
    title: string
  }
}

// Polling 設定（作為 WebSocket 的 fallback）
const BASE_POLL_INTERVAL = 60_000
const MAX_POLL_INTERVAL = 300_000
const BACKOFF_MULTIPLIER = 1.5

const devLog = (...args: unknown[]) => {
  if (import.meta.dev) {
    console.log(...args)
  }
}

export const useAlerts = () => {
  const alertQueue = ref<AlertItem[]>([])
  const currentAlert = ref<AlertItem | null>(null)
  const showAlert = ref(false)
  // 使用 Map 追蹤處理時間，支援定期清理舊資料
  const processedAlerts = ref<Map<string, number>>(new Map())

  // Polling 相關（fallback用）
  let pollTimer: ReturnType<typeof setTimeout> | null = null
  let currentPollInterval = BASE_POLL_INTERVAL
  let lastResetDate = new Date().toDateString()
  let cleanupTimer: ReturnType<typeof setInterval> | null = null

  // WebSocket 相關
  let unsubscribeAlert: (() => void) | null = null

  const { t } = useI18n()
  const toast = useToast()
  const { isConnected, onAlert, dismissAlert: wsDismissAlert } = useWebSocket()
  const { runWithAuthRecovery } = useAuthRecovery()
  const { isAuthenticated } = useAuth()

  const hasNextAlert = computed(() => alertQueue.value.length > 0)

  // ============ Polling 邏輯（Fallback）============

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

  const fetchAlertsViaHttp = async (): Promise<AlertItem[]> => {
    if (!isAuthenticated.value) return []

    try {
      const response = await runWithAuthRecovery(() => $fetch<AlertApiResponse[]>('/api/alerts'))
      return response.map(alert => ({
        id: alert.id,
        message: alert.message,
        trigger_at: alert.triggerAt,
        is_dismissed: alert.isDismissed,
        diary: alert.diary ? {
          id: alert.diary.id,
          title: alert.diary.title
        } : undefined
      }))
    } catch {
      return []
    }
  }

  const startPolling = async () => {
    if (!isAuthenticated.value) {
      stopPolling()
      return
    }

    checkDailyReset()
    
    const alerts = await fetchAlertsViaHttp()
    enqueueAlerts(alerts)
    
    // 如果 WebSocket 未連線，繼續 polling
    if (!isConnected.value) {
      applyBackoff(startPolling)
    }
  }

  const stopPolling = () => {
    if (pollTimer) {
      clearTimeout(pollTimer)
      pollTimer = null
    }
  }

  const clearAlertState = () => {
    alertQueue.value = []
    currentAlert.value = null
    showAlert.value = false
  }

  const syncAlertTransport = async () => {
    if (!isAuthenticated.value) {
      stopPolling()
      clearAlertState()
      return
    }

    const alerts = await fetchAlertsViaHttp()
    enqueueAlerts(alerts)

    if (!isConnected.value) {
      devLog('[Alerts] WebSocket not connected, starting HTTP polling')
      scheduleNextPoll(startPolling)
    }
  }

  // ============ Alert 佇列管理 ============

  const enqueueAlerts = (alerts: AlertItem[]) => {
    const now = new Date()
    const nowTimestamp = Date.now()
    alerts.forEach(alert => {
      const triggerTime = new Date(alert.trigger_at)
      const key = alert.id

      if (
        triggerTime <= now &&
        !alert.is_dismissed &&
        !processedAlerts.value.has(key)
      ) {
        processedAlerts.value.set(key, nowTimestamp)
        alertQueue.value.push(alert)
      }
    })

    if (!currentAlert.value && alertQueue.value.length > 0) {
      showNextAlert()
    }
  }

  const enqueueSingleAlert = (alert: AlertPayload) => {
    const key = alert.id

    if (processedAlerts.value.has(key)) {
      return // 已處理過
    }

    processedAlerts.value.set(key, Date.now())
    alertQueue.value.push({
      id: alert.id,
      message: alert.message,
      trigger_at: alert.triggerAt,
      is_dismissed: false,
      diary: alert.diary
    })

    if (!currentAlert.value) {
      showNextAlert()
    }
  }

  // 清理 24 小時前的已處理 alerts（防止記憶體洩漏）
  const cleanupProcessedAlerts = () => {
    const oneDayAgo = Date.now() - 86400000 // 24 hours
    let cleanedCount = 0

    for (const [key, timestamp] of processedAlerts.value.entries()) {
      if (timestamp < oneDayAgo) {
        processedAlerts.value.delete(key)
        cleanedCount++
      }
    }

    if (cleanedCount > 0) {
      devLog(`[Alerts] Cleaned up ${cleanedCount} old processed alerts`)
    }
  }

  const showNextAlert = () => {
    currentAlert.value = alertQueue.value.shift() || null
    showAlert.value = !!currentAlert.value
  }

  // ============ 關閉 Alert ============

  const dismissCurrentAlert = async () => {
    if (!currentAlert.value) return

    const alert = currentAlert.value
    showAlert.value = false

    try {
      // 優先使用 WebSocket
      if (isConnected.value) {
        const success = await wsDismissAlert(alert.id)
        if (!success) {
          // WebSocket 失敗，使用 HTTP fallback
          await runWithAuthRecovery(() => $fetch(`/api/alerts/${alert.id}/dismiss`, { method: 'PUT' }))
        }
      } else {
        // WebSocket 未連線，使用 HTTP
        await runWithAuthRecovery(() => $fetch(`/api/alerts/${alert.id}/dismiss`, { method: 'PUT' }))
      }
    } catch {
      toast.error(t('alert.dismissFailed'))
    }

    currentAlert.value = null

    if (alertQueue.value.length > 0) {
      showNextAlert()
    }
  }

  // ============ 生命週期 ============

  onMounted(async () => {
    // 先註冊 WebSocket Alert 監聽器（避免 race condition）
    unsubscribeAlert = onAlert((alert: AlertPayload) => {
      devLog('[Alerts] Received alert via WebSocket:', alert)
      enqueueSingleAlert(alert)
    })

    // 初始載入：只在已登入時透過 HTTP 載入現有 alerts。
    await syncAlertTransport()

    // 監聽 WebSocket 連線狀態變化
    watch(isConnected, (connected) => {
      if (!isAuthenticated.value) {
        stopPolling()
        return
      }

      if (connected) {
        devLog('[Alerts] WebSocket connected, stopping HTTP polling')
        stopPolling()
      } else {
        devLog('[Alerts] WebSocket disconnected, starting HTTP polling')
        scheduleNextPoll(startPolling)
      }
    })

    watch(isAuthenticated, () => {
      void syncAlertTransport()
    })

    // 啟動定期清理（每小時清理一次）
    cleanupTimer = setInterval(cleanupProcessedAlerts, 3600000) // 1 hour
  })

  onUnmounted(() => {
    stopPolling()
    if (cleanupTimer) {
      clearInterval(cleanupTimer)
      cleanupTimer = null
    }
    if (unsubscribeAlert) {
      unsubscribeAlert()
      unsubscribeAlert = null
    }
  })

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
    setBaseInterval: () => (currentPollInterval = BASE_POLL_INTERVAL),
    // 新增：WebSocket 連線狀態
    isWebSocketConnected: isConnected
  }
}
