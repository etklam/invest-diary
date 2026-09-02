export {
  TRADE_PLAN_STATUSES,
  type TradePlanStatus,
  type TradePlanResponse as TradePlan,
  type TradePlanListResponse,
} from '~/lib/contracts/trade-plan'
import type { TradePlanStatus } from '~/lib/contracts/trade-plan'

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
