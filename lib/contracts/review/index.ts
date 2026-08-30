import { z } from 'zod'

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
