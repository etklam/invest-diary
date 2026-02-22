import { ref } from 'vue'
import type { AlertPayload } from '../types/websocket'

export const useWebSocket = () => {
  const nuxtApp = useNuxtApp()

  // ✅ SSR / plugin 尚未初始化時的安全 fallback
  const emptyRef = ref(false)
  const emptyStatus = ref<'disconnected'>('disconnected')
  const emptyError = ref<string | null>(null)

  const ws = nuxtApp.$websocket

  if (!ws) {
    // client plugin 尚未 ready 或在 SSR 呼叫
    return {
      isConnected: emptyRef,
      connectionStatus: emptyStatus,
      lastError: emptyError,
      connect: () => {},
      disconnect: () => {},
      onAlert: () => () => {},
      dismissAlert: async () => false
    }
  }

  return {
    // 狀態（由 plugin 提供）
    isConnected: ws.isConnected,
    connectionStatus: ws.connectionStatus,
    lastError: ws.lastError,

    // API（thin facade）
    connect: ws.connect,
    disconnect: ws.disconnect,
    onAlert: (cb: (alert: AlertPayload) => void) => ws.subscribeAlert(cb),
    dismissAlert: (alertId: string) => ws.dismissAlert(alertId)
  }
}
