import { ref, computed, onMounted, onUnmounted } from 'vue'
import type { AlertPayload } from '../types/websocket'
import { POLLING } from '~/lib/constants'

export interface AlertItem {
  id: string | number
  message: string
  trigger_at: string
  is_dismissed: boolean
  diary?: {
    id: string
    title: string
  }
}

interface AlertApiResponse {
  id: string | number | bigint
  message: string
  triggerAt: string
  isDismissed: boolean
  diary?: {
    id: string | number | bigint
    title: string
  }
}

// Polling 設定（作為 WebSocket 的 fallback）
const BASE_POLL_INTERVAL = POLLING.BASE_INTERVAL
const MAX_POLL_INTERVAL = POLLING.MAX_INTERVAL
const BACKOFF_MULTIPLIER = POLLING.BACKOFF_MULTIPLIER

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
    try {
      const response = await $fetch<AlertApiResponse[]>('/api/alerts')
      return response.map(alert => ({
        id: alert.id.toString(),
        message: alert.message,
        trigger_at: alert.triggerAt,
        is_dismissed: alert.isDismissed,
        diary: alert.diary ? {
          id: alert.diary.id.toString(),
          title: alert.diary.title
        } : undefined
      }))
    } catch {
      return []
    }
  }

  const startPolling = async () => {
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

  // ============ Alert 佇列管理 ============

  const enqueueAlerts = (alerts: AlertItem[]) => {
    const now = new Date()
    const nowTimestamp = Date.now()
    alerts.forEach(alert => {
      const triggerTime = new Date(alert.trigger_at)
      const key = alert.id.toString()

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
    const key = alert.id.toString()

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
        const success = await wsDismissAlert(alert.id.toString())
        if (!success) {
          // WebSocket 失敗，使用 HTTP fallback
          await $fetch(`/api/alerts/${alert.id}/dismiss`, { method: 'PUT' })
        }
      } else {
        // WebSocket 未連線，使用 HTTP
        await $fetch(`/api/alerts/${alert.id}/dismiss`, { method: 'PUT' })
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

    // 初始載入：透過 HTTP 載入現有 alerts
    // （在 WebSocket listener 註冊後執行，確保不會漏掉任何 alerts）
    const alerts = await fetchAlertsViaHttp()
    enqueueAlerts(alerts)

    // 如果 WebSocket 未連線，啟動 polling
    if (!isConnected.value) {
      devLog('[Alerts] WebSocket not connected, starting HTTP polling')
      scheduleNextPoll(startPolling)
    }

    // 監聽 WebSocket 連線狀態變化
    watch(isConnected, (connected) => {
      if (connected) {
        devLog('[Alerts] WebSocket connected, stopping HTTP polling')
        stopPolling()
      } else {
        devLog('[Alerts] WebSocket disconnected, starting HTTP polling')
        scheduleNextPoll(startPolling)
      }
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
