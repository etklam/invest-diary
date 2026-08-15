import { ref, onMounted, onUnmounted, watch } from 'vue'
import { normalizeAlert, type AlertApiResponse, type AlertItem, type AlertPayload } from '~/types/alert'
import { useAuthRecovery } from '~/composables/useAuthRecovery'

export type { AlertItem } from '~/types/alert'

// ponytail: SSR / pre-plugin safe fallback — $websocket only exists on client.
const emptyIsConnected = ref(false)
const noopUnsubscribe = () => {}
const noopUnsubscribeAlert = (_cb: (alert: AlertPayload) => void) => noopUnsubscribe
const noopDismissAlert = async (_alertId: string) => false

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
  let dismissInFlight = false

  const { t } = useI18n()
  const toast = useToast()
  // ponytail: read $websocket directly — plugins/websocket.client.ts owns the singleton.
  const ws = useNuxtApp().$websocket
  const isConnected = ws ? ws.isConnected : emptyIsConnected
  const onAlert = ws
    ? (cb: (alert: AlertPayload) => void) => ws.subscribeAlert(cb)
    : noopUnsubscribeAlert
  const wsDismissAlert = ws
    ? (alertId: string) => ws.dismissAlert(alertId)
    : noopDismissAlert
  const { runWithAuthRecovery } = useAuthRecovery()
  const { isAuthenticated } = useAuth()

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
      return response.map(normalizeAlert)
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

  const isAlertKnown = (alertId: string) => (
    processedAlerts.value.has(alertId) ||
    currentAlert.value?.id === alertId ||
    alertQueue.value.some(alert => alert.id === alertId)
  )

  const enqueueAlerts = (alerts: AlertItem[]) => {
    const now = new Date()
    const nowTimestamp = Date.now()
    alerts.forEach(alert => {
      const triggerTime = new Date(alert.triggerAt)
      const key = alert.id

      if (
        triggerTime <= now &&
        !alert.isDismissed &&
        !isAlertKnown(key)
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
    const normalizedAlert = normalizeAlert(alert)
    const key = normalizedAlert.id

    if (isAlertKnown(key)) {
      return // 已處理過
    }

    processedAlerts.value.set(key, Date.now())
    alertQueue.value.push(normalizedAlert)

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
    if (!currentAlert.value || dismissInFlight) return false

    const alert = currentAlert.value
    dismissInFlight = true

    try {
      let persisted = false

      // 優先使用 WebSocket；事件錯誤與明確 false 都走 HTTP fallback。
      if (isConnected.value) {
        try {
          persisted = await wsDismissAlert(alert.id)
        } catch {
          persisted = false
        }
      }

      if (!persisted) {
        await runWithAuthRecovery(() => $fetch(`/api/alerts/${alert.id}/dismiss`, { method: 'PUT' }))
        persisted = true
      }

      // 只有 persistence 成功才允許佇列前進。
      processedAlerts.value.delete(alert.id)
      currentAlert.value = null
      showAlert.value = false

      if (alertQueue.value.length > 0) {
        showNextAlert()
      }

      return true
    } catch {
      // persistence 失敗時保留目前提醒，並解除 marker 讓後續重試可重新入列。
      currentAlert.value = alert
      showAlert.value = true
      processedAlerts.value.delete(alert.id)
      toast.error(t('alert.dismissFailed'))
      return false
    } finally {
      dismissInFlight = false
    }
  }

  // ============ 生命週期 ============

  onMounted(async () => {
    // 先註冊 WebSocket Alert 監聽器（避免 race condition）
    unsubscribeAlert = onAlert((alert: AlertPayload) => {
      devLog('[Alerts] Received alert via WebSocket:', alert)
      enqueueSingleAlert(alert)
    })

    // Watchers 必須在同步階段註冊：await 之後 continuation 沒有 component
    // instance，watcher 不會自動 dispose，layout 切換時會永久洩漏。
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

    // 初始載入：只在已登入時透過 HTTP 載入現有 alerts。
    await syncAlertTransport()

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
    dismissCurrentAlert,
  }
}
