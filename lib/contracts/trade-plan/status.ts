import { z } from 'zod'

export const TRADE_PLAN_STATUSES = ['draft', 'active', 'closed', 'cancelled'] as const
export const tradePlanStatusSchema = z.enum(TRADE_PLAN_STATUSES)
export type TradePlanStatus = z.infer<typeof tradePlanStatusSchema>
