import { z } from 'zod'
import { decimalStringSchema, serializedIdSchema, utcInstantSchema } from '../common/ids'
import { stockSymbolSchema } from '../stocks'

export const ALERT_RECURRING_MODES = ['WEEK', 'MONTH'] as const
export const alertRecurringModeSchema = z.enum(ALERT_RECURRING_MODES)

export const alertDraftSchema = z.object({
  message: z.string().trim().min(1).max(500),
  triggerAt: utcInstantSchema,
  recurringMode: alertRecurringModeSchema.optional(),
}).strict()

export const alertCreateRequestSchema = z.object({
  diaryId: serializedIdSchema,
  ...alertDraftSchema.shape,
}).strict()

export const alertDiaryReferenceSchema = z.object({
  id: serializedIdSchema,
  title: z.string(),
}).strict()

export const alertResponseSchema = z.object({
  id: serializedIdSchema,
  diaryId: serializedIdSchema,
  message: z.string(),
  triggerAt: utcInstantSchema,
  isDismissed: z.boolean(),
  recurringMode: alertRecurringModeSchema.nullable(),
  parentId: serializedIdSchema.nullable(),
  instanceNumber: z.number().int().positive(),
  isPaused: z.boolean(),
  createdAt: utcInstantSchema,
  diary: alertDiaryReferenceSchema.nullable(),
}).strict()

export const ALERT_MAX_ITEMS = 100
export const alertListResponseSchema = z.array(alertResponseSchema).max(ALERT_MAX_ITEMS)

export const PRICE_ALERT_TYPES = ['PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_PERCENT', 'MOVING_AVG'] as const
export const priceAlertTypeSchema = z.enum(PRICE_ALERT_TYPES)

// price_alerts.threshold is DECIMAL(10,4): at most six integer digits and
// four fractional digits. Reject exponent notation before it reaches Prisma;
// otherwise MariaDB accepts it but the response Decimal mapper cannot emit a
// canonical decimal string.
const PRICE_ALERT_THRESHOLD_RE = /^-?\d{1,6}(?:\.\d{1,4})?$/

const priceAlertThresholdInputSchema = z.preprocess(
  value => value === '' ? undefined : value,
  z.union([
    z.string().trim().regex(PRICE_ALERT_THRESHOLD_RE, 'Threshold must fit DECIMAL(10,4)'),
    z.number().finite().refine(value => PRICE_ALERT_THRESHOLD_RE.test(String(value)), 'Threshold must fit DECIMAL(10,4)'),
  ]).transform(value => String(value).trim()),
)

export const createPriceAlertRequestSchema = z.object({
  symbol: stockSymbolSchema,
  type: priceAlertTypeSchema,
  threshold: priceAlertThresholdInputSchema,
  message: z.string().trim().max(500).optional(),
}).strict().superRefine((value, context) => {
  if (value.type !== 'CHANGE_PERCENT' && value.threshold.startsWith('-')) {
    context.addIssue({
      code: 'custom',
      path: ['threshold'],
      message: 'Threshold must be non-negative for this alert type',
    })
  }
})

export const updatePriceAlertRequestSchema = z.object({
  threshold: priceAlertThresholdInputSchema.optional(),
  message: z.string().trim().max(500).optional(),
  isTriggered: z.boolean().optional(),
  triggeredAt: utcInstantSchema.nullable().optional(),
}).strict()
  .refine(value => Object.keys(value).length > 0, {
    message: 'At least one field must be provided',
  })
  .superRefine((value, context) => {
    const hasTriggeredState = value.isTriggered !== undefined || value.triggeredAt !== undefined
    if (!hasTriggeredState) return

    if (value.isTriggered === undefined || value.triggeredAt === undefined) {
      context.addIssue({
        code: 'custom',
        path: ['isTriggered'],
        message: 'isTriggered and triggeredAt must be updated together',
      })
      return
    }

    if (value.isTriggered !== (value.triggeredAt !== null)) {
      context.addIssue({
        code: 'custom',
        path: ['triggeredAt'],
        message: 'triggeredAt must be set exactly when isTriggered is true',
      })
    }
  })

export const priceAlertResponseSchema = z.object({
  id: serializedIdSchema,
  symbol: stockSymbolSchema,
  type: priceAlertTypeSchema,
  threshold: decimalStringSchema,
  message: z.string(),
  isTriggered: z.boolean(),
  triggeredAt: utcInstantSchema.nullable(),
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
}).strict()

export const PRICE_ALERT_MAX_ITEMS = 100
export const priceAlertListResponseSchema = z.array(priceAlertResponseSchema).max(PRICE_ALERT_MAX_ITEMS)

export type AlertRecurringMode = z.infer<typeof alertRecurringModeSchema>
export type AlertDraft = z.infer<typeof alertDraftSchema>
export type AlertCreateRequest = z.infer<typeof alertCreateRequestSchema>
export type AlertResponse = z.infer<typeof alertResponseSchema>
export type CreatePriceAlertRequest = z.infer<typeof createPriceAlertRequestSchema>
export type UpdatePriceAlertRequest = z.infer<typeof updatePriceAlertRequestSchema>
export type PriceAlertResponse = z.infer<typeof priceAlertResponseSchema>

function iso(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString()
}

function decimal(value: unknown): string {
  return String(value)
}

export function toAlertResponse(row: {
  id: bigint
  diaryId: bigint
  message: string
  triggerAt: Date | string
  isDismissed?: boolean
  recurringMode?: AlertRecurringMode | string | null
  parentId?: bigint | null
  instanceNumber?: number | null
  isPaused?: boolean
  createdAt: Date | string
  diary?: { id: bigint; title: string } | null
}): AlertResponse {
  return alertResponseSchema.parse({
    id: String(row.id),
    diaryId: String(row.diaryId),
    message: row.message,
    triggerAt: iso(row.triggerAt),
    isDismissed: row.isDismissed ?? false,
    recurringMode: row.recurringMode ?? null,
    parentId: row.parentId === undefined || row.parentId === null ? null : String(row.parentId),
    instanceNumber: row.instanceNumber ?? 1,
    isPaused: row.isPaused ?? false,
    createdAt: iso(row.createdAt),
    diary: row.diary ? { id: String(row.diary.id), title: row.diary.title } : null,
  })
}

export function toPriceAlertResponse(row: {
  id: bigint
  userId?: bigint
  symbol: string
  type: string
  threshold: unknown
  message: string
  isTriggered: boolean
  triggeredAt: Date | string | null
  createdAt: Date | string
  updatedAt: Date | string
}): PriceAlertResponse {
  return priceAlertResponseSchema.parse({
    id: String(row.id),
    symbol: row.symbol,
    type: row.type,
    threshold: decimal(row.threshold),
    message: row.message,
    isTriggered: row.isTriggered,
    triggeredAt: row.triggeredAt === null ? null : iso(row.triggeredAt),
    createdAt: iso(row.createdAt),
    updatedAt: iso(row.updatedAt),
  })
}
