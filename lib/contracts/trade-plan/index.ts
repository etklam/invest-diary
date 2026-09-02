import { z } from 'zod'
import { calendarDateSchema, decimalStringSchema, serializedIdSchema, utcInstantSchema } from '../common/ids'
import { REVIEW_OUTCOMES, REVIEW_STATUSES } from '../review'
import { stockSymbolSchema } from '../stocks'
import { TRADE_PLAN_STATUSES, tradePlanStatusSchema } from './status'

export { TRADE_PLAN_STATUSES, tradePlanStatusSchema }

const nonNegativeDecimalInputSchema = z.preprocess(
  value => value === '' ? undefined : value,
  z.union([
    z.string().trim().regex(/^\d+(?:\.\d+)?$/, 'Value must be a non-negative decimal string'),
    z.number().finite().nonnegative(),
  ]).transform(value => String(value).trim()).optional().nullable(),
)

const optionalText = (max: number) => z.preprocess(
  value => typeof value === 'string' && value.trim() === '' ? null : value,
  z.string().trim().max(max).nullable().optional(),
)

const tradePlanDiaryIdInputSchema = z.preprocess(
  value => value === '' ? null : value,
  serializedIdSchema.nullable().optional(),
)

export const tradePlanWriteFieldsSchema = z.object({
  diaryId: tradePlanDiaryIdInputSchema,
  symbol: stockSymbolSchema,
  setupType: optionalText(100),
  entryPrice: nonNegativeDecimalInputSchema,
  entryZoneLow: nonNegativeDecimalInputSchema,
  entryZoneHigh: nonNegativeDecimalInputSchema,
  stopLoss: nonNegativeDecimalInputSchema,
  targetPrice: nonNegativeDecimalInputSchema,
  maxPositionSize: nonNegativeDecimalInputSchema,
  invalidationCondition: optionalText(5_000),
  notes: optionalText(10_000),
  status: tradePlanStatusSchema.default('draft'),
}).strict()

const validateEntryZoneOrder = (value: { entryZoneLow?: string | null; entryZoneHigh?: string | null }, context: z.RefinementCtx) => {
  if (value.entryZoneLow && value.entryZoneHigh && Number(value.entryZoneLow) > Number(value.entryZoneHigh)) {
    context.addIssue({
      code: 'custom',
      path: ['entryZoneHigh'],
      message: 'entryZoneHigh must be greater than or equal to entryZoneLow',
    })
  }
}

export const tradePlanInputSchema = tradePlanWriteFieldsSchema.superRefine(validateEntryZoneOrder)

export const tradePlanUpdateSchema = tradePlanWriteFieldsSchema.partial()
  .refine(value => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  })
  .superRefine(validateEntryZoneOrder)

export const tradePlanSortSchema = z.enum(['updatedAt-desc', 'createdAt-desc', 'symbol-asc']).default('updatedAt-desc')
export const tradePlanStatusQuerySchema = tradePlanStatusSchema.optional()

export const tradePlanListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  status: tradePlanStatusSchema.optional(),
  symbol: stockSymbolSchema.optional(),
  sortBy: tradePlanSortSchema,
}).strict()

export const tradePlanDiaryLinkSchema = z.object({
  id: serializedIdSchema,
  title: z.string(),
  date: calendarDateSchema,
  reviewStatus: z.enum(REVIEW_STATUSES).nullable(),
  reviewOutcome: z.enum(REVIEW_OUTCOMES).nullable(),
  transactionCount: z.number().int().nonnegative(),
}).strict()

const responseDecimalSchema = decimalStringSchema.regex(/^\d+(?:\.\d+)?$/, 'Value must be a non-negative decimal string')

export const tradePlanResponseSchema = z.object({
  id: serializedIdSchema,
  userId: serializedIdSchema,
  diaryId: serializedIdSchema.nullable(),
  symbol: stockSymbolSchema,
  setupType: z.string().nullable(),
  entryPrice: responseDecimalSchema.nullable(),
  entryZoneLow: responseDecimalSchema.nullable(),
  entryZoneHigh: responseDecimalSchema.nullable(),
  stopLoss: responseDecimalSchema.nullable(),
  targetPrice: responseDecimalSchema.nullable(),
  maxPositionSize: responseDecimalSchema.nullable(),
  invalidationCondition: z.string().nullable(),
  notes: z.string().nullable(),
  status: tradePlanStatusSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  diary: tradePlanDiaryLinkSchema.nullable(),
}).strict()

export const tradePlanListResponseSchema = z.object({
  data: z.array(tradePlanResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }).strict(),
}).strict()

export type TradePlanStatus = z.infer<typeof tradePlanStatusSchema>
export type TradePlanInput = z.infer<typeof tradePlanInputSchema>
export type TradePlanUpdate = z.infer<typeof tradePlanUpdateSchema>
export type TradePlanListParams = z.infer<typeof tradePlanListParamsSchema>
export type TradePlanResponse = z.infer<typeof tradePlanResponseSchema>
export type TradePlanListResponse = z.infer<typeof tradePlanListResponseSchema>

function dateToWire(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function decimalToWire(value: unknown): string | null {
  if (value === null || value === undefined) return null
  return String(value)
}

function calendarDateToWire(value: Date | string): string {
  const raw = value instanceof Date ? value : new Date(value)
  return raw.toISOString().slice(0, 10)
}

/** Convert a Prisma row into the public Trade Plan DTO and validate it. */
export function toTradePlanResponse(row: {
  id: bigint
  userId: bigint
  diaryId: bigint | null
  symbol: string
  setupType: string | null
  entryPrice: unknown
  entryZoneLow: unknown
  entryZoneHigh: unknown
  stopLoss: unknown
  targetPrice: unknown
  maxPositionSize: unknown
  invalidationCondition: string | null
  notes: string | null
  status: TradePlanStatus | string
  createdAt: Date | string
  updatedAt: Date | string
  diary?: {
    id: bigint
    title: string
    date: Date | string
    reviewStatus?: string | null
    reviewOutcome?: string | null
    transactionCount?: number
    _count?: { transactions: number }
  } | null
}): TradePlanResponse {
  return tradePlanResponseSchema.parse({
    id: String(row.id),
    userId: String(row.userId),
    diaryId: row.diaryId === null ? null : String(row.diaryId),
    symbol: row.symbol,
    setupType: row.setupType ?? null,
    entryPrice: decimalToWire(row.entryPrice),
    entryZoneLow: decimalToWire(row.entryZoneLow),
    entryZoneHigh: decimalToWire(row.entryZoneHigh),
    stopLoss: decimalToWire(row.stopLoss),
    targetPrice: decimalToWire(row.targetPrice),
    maxPositionSize: decimalToWire(row.maxPositionSize),
    invalidationCondition: row.invalidationCondition ?? null,
    notes: row.notes ?? null,
    status: String(row.status).toLowerCase(),
    createdAt: dateToWire(row.createdAt),
    updatedAt: dateToWire(row.updatedAt),
    diary: row.diary
      ? {
          id: String(row.diary.id),
          title: row.diary.title,
          date: calendarDateToWire(row.diary.date),
          reviewStatus: row.diary.reviewStatus
            ? row.diary.reviewStatus.toLowerCase() as (typeof REVIEW_STATUSES)[number]
            : null,
          reviewOutcome: row.diary.reviewOutcome ?? null,
          transactionCount: row.diary.transactionCount ?? row.diary._count?.transactions ?? 0,
        }
      : null,
  })
}

export function toTradePlanListResponse(
  rows: Parameters<typeof toTradePlanResponse>[0][],
  pagination: { page: number; limit: number; total: number },
): TradePlanListResponse {
  return tradePlanListResponseSchema.parse({
    data: rows.map(toTradePlanResponse),
    pagination: {
      ...pagination,
      totalPages: pagination.total === 0 ? 0 : Math.ceil(pagination.total / pagination.limit),
    },
  })
}
