import { z } from 'zod'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { TRADE_PLAN_STATUSES } from '~/types/trade-plan'

const optionalText = (max: number) => z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? undefined : value,
  z.string().trim().max(max).optional().nullable(),
)

const optionalDecimalString = z.preprocess(
  value => value === '' ? undefined : value,
  z.union([z.string(), z.number()])
    .transform(value => String(value).trim())
    .refine(value => /^\d+(\.\d+)?$/.test(value), 'Must be a non-negative number')
    .optional()
    .nullable(),
)

const optionalDiaryId = z.preprocess(
  value => value === '' ? undefined : value,
  z.union([z.string(), z.number(), z.bigint()])
    .transform(value => BigInt(value))
    .refine(value => value > BigInt(0), 'diaryId must be positive')
    .optional()
    .nullable(),
)

const tradePlanBaseSchema = z.object({
  diaryId: optionalDiaryId,
  symbol: z.string().min(1).max(32).transform(normalizeStockSymbol),
  setupType: optionalText(100),
  entryPrice: optionalDecimalString,
  entryZoneLow: optionalDecimalString,
  entryZoneHigh: optionalDecimalString,
  stopLoss: optionalDecimalString,
  targetPrice: optionalDecimalString,
  maxPositionSize: optionalDecimalString,
  invalidationCondition: optionalText(5000),
  notes: optionalText(10000),
  status: z.enum(TRADE_PLAN_STATUSES).default('draft'),
})

const entryZoneOrderRefinement = (value: { entryZoneLow?: string | null; entryZoneHigh?: string | null }) => {
  if (!value.entryZoneLow || !value.entryZoneHigh) return true
  return Number(value.entryZoneLow) <= Number(value.entryZoneHigh)
}

export const tradePlanInputSchema = tradePlanBaseSchema.refine(entryZoneOrderRefinement, {
  path: ['entryZoneHigh'],
  message: 'entryZoneHigh must be greater than or equal to entryZoneLow',
})

export const tradePlanUpdateSchema = tradePlanBaseSchema.partial()
  .refine(value => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
  .refine(entryZoneOrderRefinement, {
    path: ['entryZoneHigh'],
    message: 'entryZoneHigh must be greater than or equal to entryZoneLow',
  })

export const tradePlanStatusQuerySchema = z.enum(TRADE_PLAN_STATUSES).optional()
