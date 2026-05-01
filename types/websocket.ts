/**
 * WebSocket 訊息型別定義
 */

// Alert 推播 payload
export interface AlertPayload {
  id: string
  message: string
  triggerAt: string
  diary?: {
    id: string
    title: string
  }
}

// 連線成功回應
export interface ConnectionSuccessPayload {
  socketId: string
  userId: string
}

// Drawdown alert payload
export interface DrawdownAlertPayload {
  currentValue: number
  peakValue: number
  drawdownPct: number
  threshold: number
  peakDate: string
  currentDate: string
  message: string
  benchmarkSymbol: string
}

// Price alert 推送 payload
export interface PriceAlertPayload {
  id: string
  symbol: string
  type: string
  threshold: number
  currentPrice: number
  message: string
  triggeredAt: string
}

// Server -> Client 事件
export interface ServerToClientEvents {
  'alert:triggered': (alert: AlertPayload) => void
  'alert:dismissed': (data: { alertId: string }) => void
  'alert:error': (data: { message: string; alertId?: string }) => void
  'drawdown:alert': (data: DrawdownAlertPayload) => void
  'price-alert:triggered': (data: PriceAlertPayload) => void
  'system:notification': (data: { message: string; type: 'info' | 'warning' | 'error' }) => void
  'connection:success': (data: ConnectionSuccessPayload) => void
  'pong': () => void
}

// Client -> Server 事件
export interface ClientToServerEvents {
  'alert:dismiss': (alertId: string) => void
  'ping': () => void
}

// Inter-Socket 事件（內部使用）
export interface InterServerEvents {
  'broadcast': (event: string, data: any) => void
}

// Socket Data（每個連線的資料）
export interface SocketData {
  userId: string
  connectedAt: Date
}

// 連線狀態
export type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'reconnecting' | 'error'
