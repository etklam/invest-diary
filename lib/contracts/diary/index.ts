import { z } from 'zod'
import { calendarDateSchema, decimalStringSchema, serializedIdSchema, utcInstantSchema } from '../common/ids'
import { REVIEW_OUTCOMES, REVIEW_STATUSES } from '../review'
import { tradePlanStatusSchema } from '../trade-plan/status'
import { alertDraftSchema } from '../alerts'
import { DIARY_PAYLOAD_LIMITS } from './validation'

export { DIARY_PAYLOAD_LIMITS } from './validation'

export const DEFAULT_TAGS = [
  { key: 'profit', labelKey: 'tags.profit', color: 'green' },
  { key: 'loss', labelKey: 'tags.loss', color: 'red' },
  { key: 'watch', labelKey: 'tags.watch', color: 'blue' },
  { key: 'hold', labelKey: 'tags.hold', color: 'gray' },
  { key: 'learning', labelKey: 'tags.learning', color: 'purple' },
  { key: 'mistake', labelKey: 'tags.mistake', color: 'orange' },
] as const
export type TagKey = typeof DEFAULT_TAGS[number]['key']

export const DIARY_SORT_FIELDS = ['date-desc', 'date-asc', 'title-asc', 'title-desc'] as const
export type DiarySortField = typeof DIARY_SORT_FIELDS[number]
export const DIARY_REVIEW_STATUSES = REVIEW_STATUSES

/** Canonical GET /api/diaries query. Unknown keys, including removed `days`, are rejected. */
export const diaryListParamsSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).max(500).optional(),
  sortBy: z.enum(DIARY_SORT_FIELDS).default('date-desc'),
  dateFrom: calendarDateSchema.optional(),
  dateTo: calendarDateSchema.optional(),
  reviewStatus: z.enum(REVIEW_STATUSES).optional(),
}).strict().superRefine((value, context) => {
  if (value.dateFrom && value.dateTo && value.dateFrom > value.dateTo) {
    context.addIssue({ code: 'custom', path: ['dateTo'], message: 'dateTo must be on or after dateFrom' })
  }
})
export type DiaryListParams = z.infer<typeof diaryListParamsSchema>

const nullableText = z.string().max(10_000).nullable().optional()
const positiveDecimalInputSchema = z.union([
  z.number().positive().finite(),
  z.string().regex(/^\d+(?:\.\d+)?$/).refine(value => Number(value) > 0, 'Value must be greater than 0'),
])

export const transactionInputSchema = z.object({
  id: serializedIdSchema.optional(),
  symbol: z.string().trim().min(1).max(20).transform(value => value.toUpperCase()),
  type: z.enum(['BUY', 'SELL']),
  quantity: positiveDecimalInputSchema,
  price: positiveDecimalInputSchema,
  tradeDate: utcInstantSchema,
  notes: nullableText,
  strategy: z.string().max(100).nullable().optional(),
  emotion: z.string().max(20).nullable().optional(),
}).strict()

export const alertInputSchema = alertDraftSchema.extend({
  id: serializedIdSchema.optional(),
}).strict()

const diaryWriteFields = {
  title: z.string().trim().min(1).max(DIARY_PAYLOAD_LIMITS.title),
  content: z.string().min(1).max(DIARY_PAYLOAD_LIMITS.content),
  tags: z.array(z.string().trim().min(1).max(100)).max(50).optional(),
  date: calendarDateSchema.optional(),
  transactions: z.array(transactionInputSchema).max(DIARY_PAYLOAD_LIMITS.transactions).optional(),
  alerts: z.array(alertInputSchema).max(DIARY_PAYLOAD_LIMITS.alerts).optional(),
  thesis: nullableText,
  risk: nullableText,
  execution: nullableText,
  reviewDueAt: utcInstantSchema.nullable().optional(),
  stockSymbols: z.array(z.string().trim().min(1).max(20).transform(value => value.toUpperCase())).max(50).optional(),
}

export const createDiaryRequestSchema = z.object({ ...diaryWriteFields, appendToToday: z.boolean().optional() }).strict()
export const updateDiaryRequestSchema = z.object(diaryWriteFields).strict()

export type TransactionInput = z.infer<typeof transactionInputSchema>
export type AlertInput = z.infer<typeof alertInputSchema>
export type CreateDiaryRequest = z.infer<typeof createDiaryRequestSchema>
export type UpdateDiaryRequest = z.infer<typeof updateDiaryRequestSchema>

export const transactionResponseSchema = z.object({
  id: serializedIdSchema,
  diaryId: serializedIdSchema.optional(),
  userId: serializedIdSchema.optional(),
  symbol: z.string(),
  type: z.enum(['BUY', 'SELL']),
  quantity: decimalStringSchema,
  price: decimalStringSchema,
  tradeDate: utcInstantSchema,
  notes: z.string().nullable().optional(),
  strategy: z.string().nullable().optional(),
  emotion: z.string().nullable().optional(),
  createdAt: utcInstantSchema.optional(),
}).strict()

export const diaryAlertResponseSchema = z.object({
  id: serializedIdSchema,
  diaryId: serializedIdSchema.optional(),
  message: z.string(),
  triggerAt: utcInstantSchema,
  isDismissed: z.boolean().optional(),
  recurringMode: z.enum(['WEEK', 'MONTH']).nullable().optional(),
  parentId: serializedIdSchema.nullable().optional(),
  instanceNumber: z.number().int().nullable().optional(),
  isPaused: z.boolean().optional(),
  createdAt: utcInstantSchema.optional(),
}).strict()

export const linkedTradePlanResponseSchema = z.object({
  id: serializedIdSchema,
  symbol: z.string(),
  setupType: z.string().nullable(),
  entryPrice: decimalStringSchema.nullable(),
  entryZoneLow: decimalStringSchema.nullable(),
  entryZoneHigh: decimalStringSchema.nullable(),
  stopLoss: decimalStringSchema.nullable(),
  targetPrice: decimalStringSchema.nullable(),
  maxPositionSize: decimalStringSchema.nullable(),
  invalidationCondition: z.string().nullable(),
  notes: z.string().nullable(),
  status: tradePlanStatusSchema,
}).strict()

export const diaryResponseSchema = z.object({
  id: serializedIdSchema,
  userId: serializedIdSchema,
  title: z.string(),
  content: z.string().nullable(),
  tags: z.array(z.string()),
  tagsString: z.string().nullable(),
  createdVia: z.enum(['WEB', 'API_KEY', 'TELEGRAM_BOT']),
  createdByLabel: z.string().nullable(),
  date: calendarDateSchema,
  createdAt: utcInstantSchema,
  updatedAt: utcInstantSchema,
  transactions: z.array(transactionResponseSchema).optional(),
  alerts: z.array(diaryAlertResponseSchema).optional(),
  tradePlans: z.array(linkedTradePlanResponseSchema).optional(),
  tradePlanSummary: z.object({
    total: z.number().int().nonnegative(),
    statuses: z.array(z.object({ status: tradePlanStatusSchema, count: z.number().int().positive() }).strict()),
  }).strict().optional(),
  thesis: z.string().nullable().optional(),
  risk: z.string().nullable().optional(),
  execution: z.string().nullable().optional(),
  reviewDueAt: utcInstantSchema.nullable().optional(),
  reviewStatus: z.enum(REVIEW_STATUSES).nullable().optional(),
  reviewedAt: utcInstantSchema.nullable().optional(),
  reviewOutcome: z.enum(REVIEW_OUTCOMES).nullable().optional(),
  reviewSummary: z.string().nullable().optional(),
  reviewLearning: z.string().nullable().optional(),
  reviewAdjustment: z.string().nullable().optional(),
  stockSymbols: z.array(z.string()),
}).strict()

export const diaryListResponseSchema = z.object({
  data: z.array(diaryResponseSchema),
  pagination: z.object({
    page: z.number().int().min(1),
    limit: z.number().int().min(1).max(100),
    total: z.number().int().nonnegative(),
    totalPages: z.number().int().nonnegative(),
  }).strict(),
}).strict()

export type TransactionResponse = z.infer<typeof transactionResponseSchema>
export type DiaryAlertResponse = z.infer<typeof diaryAlertResponseSchema>
export type DiaryResponse = z.infer<typeof diaryResponseSchema>
export type DiaryListResponse = z.infer<typeof diaryListResponseSchema>

export interface DiaryActivityDay { date: string; diaryId: string; alertCount: number; transactionCount: number }
export interface PaginationResponse { page: number; limit: number; total: number; totalPages: number }
export interface DiaryGroup { period: string; periodLabel: string; diaries: DiaryResponse[] }
