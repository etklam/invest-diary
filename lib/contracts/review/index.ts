import { z } from 'zod'
import { calendarDateSchema, decimalStringSchema, serializedIdSchema, utcInstantSchema } from '../common/ids'
import { tradePlanStatusSchema } from '../trade-plan/status'

export const REVIEW_OUTCOMES = ['INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR'] as const
export type ReviewOutcome = typeof REVIEW_OUTCOMES[number]

export const REVIEW_STATUSES = ['none', 'pending', 'reviewed'] as const
export type ReviewStatus = typeof REVIEW_STATUSES[number]

export const REVIEW_REFLECTION_MAX_LENGTH = 10_000

const reflectionSchema = z.string().max(REVIEW_REFLECTION_MAX_LENGTH).nullable().optional()

export const structuredReviewInputSchema = z.object({
  reviewOutcome: z.enum(REVIEW_OUTCOMES),
  reviewSummary: reflectionSchema,
  reviewLearning: reflectionSchema,
  reviewAdjustment: reflectionSchema,
}).strict().superRefine((value, context) => {
  const hasReflection = [value.reviewSummary, value.reviewLearning, value.reviewAdjustment]
    .some(reflection => Boolean(reflection?.trim()))

  if (!hasReflection) {
    context.addIssue({
      code: 'custom',
      path: ['reviewSummary'],
      message: 'At least one meaningful reflection is required',
    })
  }
})

export type StructuredReviewInput = z.infer<typeof structuredReviewInputSchema>

const reviewTransactionSchema = z.object({
  id: serializedIdSchema,
  symbol: z.string(),
  type: z.enum(['BUY', 'SELL']),
  quantity: decimalStringSchema,
  price: decimalStringSchema,
  tradeDate: utcInstantSchema,
  notes: z.string().nullable(),
  strategy: z.string().nullable(),
  emotion: z.string().nullable(),
}).strict()

const reviewTradePlanSchema = z.object({
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

/** One mutable, current post-mortem embedded in its Diary resource. */
export const diaryReviewResponseSchema = z.object({
  id: serializedIdSchema,
  title: z.string(),
  date: calendarDateSchema,
  content: z.string().nullable(),
  tags: z.array(z.string()),
  thesis: z.string().nullable(),
  risk: z.string().nullable(),
  execution: z.string().nullable(),
  reviewDueAt: utcInstantSchema.nullable(),
  reviewStatus: z.enum(REVIEW_STATUSES),
  reviewedAt: utcInstantSchema.nullable(),
  reviewOutcome: z.enum(REVIEW_OUTCOMES).nullable(),
  reviewSummary: z.string().nullable(),
  reviewLearning: z.string().nullable(),
  reviewAdjustment: z.string().nullable(),
  transactions: z.array(reviewTransactionSchema),
  tradePlans: z.array(reviewTradePlanSchema),
}).strict()

const diaryQueueItemSchema = z.object({
  targetType: z.literal('diary'),
  id: serializedIdSchema,
  title: z.string(),
  date: calendarDateSchema,
  thesis: z.string().nullable(),
  risk: z.string().nullable(),
  reviewDueAt: utcInstantSchema.nullable(),
  reviewStatus: z.enum(REVIEW_STATUSES),
  reviewedAt: utcInstantSchema.nullable(),
  reviewOutcome: z.enum(REVIEW_OUTCOMES).nullable(),
}).strict()

const thesisQueueItemSchema = z.object({
  targetType: z.literal('thesis'),
  id: z.string().regex(/^thesis:[1-9]\d*$/),
  thesisId: serializedIdSchema,
  title: z.string(),
  date: utcInstantSchema,
  thesis: z.string().nullable(),
  risk: z.null(),
  reviewDueAt: utcInstantSchema.nullable(),
  reviewStatus: z.enum(REVIEW_STATUSES),
  reviewedAt: utcInstantSchema.nullable(),
  reviewOutcome: z.string().nullable(),
  symbol: z.string().nullable(),
  thesisStatus: z.string().nullable(),
  latestReviewOutcome: z.string().nullable(),
  portfolioDecision: z.string().nullable(),
}).strict()

export const reviewQueueItemSchema = z.discriminatedUnion('targetType', [diaryQueueItemSchema, thesisQueueItemSchema])
export const reviewGroupsResponseSchema = z.object({
  unscheduled: z.array(reviewQueueItemSchema),
  overdue: z.array(reviewQueueItemSchema),
  today: z.array(reviewQueueItemSchema),
  upcoming: z.array(reviewQueueItemSchema),
  completed: z.array(reviewQueueItemSchema),
}).strict()

export type DiaryReviewResponse = z.infer<typeof diaryReviewResponseSchema>
export type ReviewItem = z.infer<typeof reviewQueueItemSchema>
export type ReviewGroups = z.infer<typeof reviewGroupsResponseSchema>
