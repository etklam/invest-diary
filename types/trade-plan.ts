import type { SerializedId } from './common'

export const TRADE_PLAN_STATUSES = ['draft', 'active', 'closed', 'cancelled'] as const
export type TradePlanStatus = typeof TRADE_PLAN_STATUSES[number]

export interface TradePlanDiaryLink {
  id: SerializedId
  title: string
  date: string
}

export interface TradePlan {
  id: SerializedId
  userId: SerializedId
  diaryId?: SerializedId | null
  symbol: string
  setupType?: string | null
  entryPrice?: string | number | null
  entryZoneLow?: string | number | null
  entryZoneHigh?: string | number | null
  stopLoss?: string | number | null
  targetPrice?: string | number | null
  maxPositionSize?: string | number | null
  invalidationCondition?: string | null
  notes?: string | null
  status: TradePlanStatus
  createdAt: string
  updatedAt: string
  diary?: TradePlanDiaryLink | null
}

export interface TradePlanListResponse {
  data: TradePlan[]
}

export interface TradePlanFormValue {
  diaryId: string
  symbol: string
  setupType: string
  entryPrice: string
  entryZoneLow: string
  entryZoneHigh: string
  stopLoss: string
  targetPrice: string
  maxPositionSize: string
  invalidationCondition: string
  notes: string
  status: TradePlanStatus
}
