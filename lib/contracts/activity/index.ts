import { z } from 'zod'
import { calendarDateSchema, decimalStringSchema, serializedIdSchema, utcInstantSchema } from '../common/ids'
import { REVIEW_OUTCOMES, REVIEW_STATUSES } from '../review'
import {
  investmentThesisStatusSchema,
  thesisPortfolioDecisionSchema,
  thesisReviewOutcomeSchema,
} from '../investment-thesis'
import { stockSymbolSchema, stockTimelineSourceTypeSchema } from '../stocks'

/**
 * Investment Activity is a merged, read-only feed.  A Diary carries its
 * business calendar date; all other activity records carry an instant.
 */
export const ACTIVITY_KINDS = ['diary', 'thesis_review', 'stock_timeline', 'thesis'] as const
export const ACTIVITY_SOURCE_KINDS = ['user', 'partner', 'ai_agent', 'system'] as const

export const activityKindSchema = z.enum(ACTIVITY_KINDS)
export const activitySourceKindSchema = z.enum(ACTIVITY_SOURCE_KINDS)

export const activitySourceSchema = z.object({
  kind: activitySourceKindSchema,
  label: z.string().nullable(),
}).strict()

const activityBaseSchema = {
  id: z.string().trim().min(1).max(256),
  symbol: stockSymbolSchema.nullable(),
  title: z.string(),
  summary: z.string(),
  source: activitySourceSchema,
  diaryId: serializedIdSchema.nullable(),
  destination: z.string().trim().min(1).max(1_024),
}

const activityTransactionSchema = z.object({
  id: serializedIdSchema,
  symbol: stockSymbolSchema,
  type: z.enum(['BUY', 'SELL']),
  quantity: decimalStringSchema,
  price: decimalStringSchema,
}).strict()

const diaryActivityMetadataSchema = z.object({
  symbols: z.array(stockSymbolSchema),
  transactionContext: z.array(activityTransactionSchema).max(100),
  reviewOutcome: z.enum(REVIEW_OUTCOMES).nullable(),
  reviewStatus: z.enum(REVIEW_STATUSES).nullable(),
  alertCount: z.number().int().nonnegative(),
  tradePlanSummary: z.object({ total: z.number().int().nonnegative() }).strict().nullable(),
}).strict()

const thesisReviewActivityMetadataSchema = z.object({
  outcome: thesisReviewOutcomeSchema,
  portfolioDecision: thesisPortfolioDecisionSchema,
}).strict()

const stockTimelineActivityMetadataSchema = z.object({
  sourceType: stockTimelineSourceTypeSchema,
  sourceUrl: z.string().url().nullable(),
}).strict()

const thesisActivityMetadataSchema = z.object({
  status: investmentThesisStatusSchema,
  latestReviewOutcome: thesisReviewOutcomeSchema.nullable(),
}).strict()

export const diaryActivityItemSchema = z.object({
  ...activityBaseSchema,
  kind: z.literal('diary'),
  occurredAt: calendarDateSchema,
  metadata: diaryActivityMetadataSchema,
}).strict()

export const thesisReviewActivityItemSchema = z.object({
  ...activityBaseSchema,
  kind: z.literal('thesis_review'),
  occurredAt: utcInstantSchema,
  metadata: thesisReviewActivityMetadataSchema,
}).strict()

export const stockTimelineActivityItemSchema = z.object({
  ...activityBaseSchema,
  kind: z.literal('stock_timeline'),
  occurredAt: utcInstantSchema,
  metadata: stockTimelineActivityMetadataSchema,
}).strict()

export const thesisActivityItemSchema = z.object({
  ...activityBaseSchema,
  kind: z.literal('thesis'),
  occurredAt: utcInstantSchema,
  metadata: thesisActivityMetadataSchema,
}).strict()

export const activityItemSchema = z.discriminatedUnion('kind', [
  diaryActivityItemSchema,
  thesisReviewActivityItemSchema,
  stockTimelineActivityItemSchema,
  thesisActivityItemSchema,
])

export const ACTIVITY_MAX_LIMIT = 50

/** Query for GET /api/investment-activity and its Diary-rooted alias. */
export const investmentActivityQuerySchema = z.object({
  symbol: stockSymbolSchema.optional(),
  limit: z.coerce.number().int().min(1).max(ACTIVITY_MAX_LIMIT).default(20),
  cursor: z.string().trim().min(1).max(512).optional(),
  /** Reuse the snapshot returned by the previous page. */
  asOf: utcInstantSchema.optional(),
}).strict()

const ACTIVITY_CURSOR_ID_PREFIXES = {
  diary: 'diary:',
  thesis_review: 'thesis-review:',
  stock_timeline: 'stock-timeline:',
  thesis: 'thesis:',
} as const

export const activityCursorPayloadSchema = z.object({
  occurredAt: z.union([calendarDateSchema, utcInstantSchema]),
  kind: activityKindSchema,
  id: z.string().trim().min(1).max(256),
  asOf: utcInstantSchema,
  symbol: stockSymbolSchema.nullable(),
}).strict().superRefine((value, context) => {
  const prefix = ACTIVITY_CURSOR_ID_PREFIXES[value.kind]
  const suffix = value.id.slice(prefix.length)
  if (!value.id.startsWith(prefix) || !/^[1-9]\d*$/.test(suffix)) {
    context.addIssue({
      code: 'custom',
      path: ['id'],
      message: 'Cursor id does not match its activity kind',
    })
  }
})

export const investmentActivityPaginationSchema = z.object({
  nextCursor: z.string().trim().min(1).max(512).nullable(),
  hasMore: z.boolean(),
  asOf: utcInstantSchema,
}).strict()

export const investmentActivityResponseSchema = z.object({
  data: z.array(activityItemSchema).max(ACTIVITY_MAX_LIMIT),
  pagination: investmentActivityPaginationSchema,
}).strict()

export type ActivityKind = z.infer<typeof activityKindSchema>
export type ActivitySource = z.infer<typeof activitySourceSchema>
export type ActivityItem = z.infer<typeof activityItemSchema>
export type InvestmentActivityQuery = z.infer<typeof investmentActivityQuerySchema>
export type ActivityCursorPayload = z.infer<typeof activityCursorPayloadSchema>
export type InvestmentActivityPagination = z.infer<typeof investmentActivityPaginationSchema>
export type InvestmentActivityResponse = z.infer<typeof investmentActivityResponseSchema>

/** Backwards-compatible descriptive aliases for callers using “list” naming. */
export const activityQuerySchema = investmentActivityQuerySchema
export const activityResponseSchema = investmentActivityResponseSchema
export const activityPaginationSchema = investmentActivityPaginationSchema
export const investmentActivityListResponseSchema = investmentActivityResponseSchema
export type InvestmentActivityListResponse = InvestmentActivityResponse

/** Validate an already assembled Activity page at the JSON boundary. */
export function toInvestmentActivityResponse(value: unknown): InvestmentActivityResponse {
  return investmentActivityResponseSchema.parse(value)
}
