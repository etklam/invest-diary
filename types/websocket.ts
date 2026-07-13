/**
 * WebSocket 訊息型別定義
 */

import type { SerializedId } from './common'
import type { AlertPayload } from './alert'

export type { AlertPayload } from './alert'

// 連線成功回應
export interface ConnectionSuccessPayload {
  socketId: string
  userId: string
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
  'price-alert:triggered': (data: PriceAlertPayload) => void
  'system:notification': (data: { message: string; type: 'info' | 'warning' | 'error' }) => void
  'connection:success': (data: ConnectionSuccessPayload) => void
  'pong': () => void
}

export type AlertBroadcastEvent = 'alert:triggered' | 'price-alert:triggered'

export interface AlertBroadcaster {
  emitToUser<E extends AlertBroadcastEvent>(
    userId: SerializedId,
    event: E,
    ...args: Parameters<ServerToClientEvents[E]>
  ): boolean
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
