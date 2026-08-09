import type { z } from 'zod'
import { z as zod } from 'zod'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { REVIEW_OUTCOMES } from '~/types/diary'

const MAX_REFLECTION_LENGTH = 10_000

const reflectionSchema = zod.string().max(MAX_REFLECTION_LENGTH).nullable().optional()

export const structuredReviewInputSchema = zod.object({
  reviewOutcome: zod.enum(REVIEW_OUTCOMES),
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

const REVIEW_DETAIL_SELECT = {
  id: true,
  title: true,
  date: true,
  content: true,
  tagsString: true,
  thesis: true,
  risk: true,
  execution: true,
  reviewDueAt: true,
  reviewStatus: true,
  reviewedAt: true,
  reviewOutcome: true,
  reviewSummary: true,
  reviewLearning: true,
  reviewAdjustment: true,
  transactions: {
    select: {
      id: true,
      symbol: true,
      type: true,
      quantity: true,
      price: true,
      tradeDate: true,
      notes: true,
      strategy: true,
      emotion: true,
    },
    orderBy: [{ tradeDate: 'asc' as const }, { id: 'asc' as const }],
  },
  tradePlans: {
    select: {
      id: true,
      symbol: true,
      setupType: true,
      entryPrice: true,
      entryZoneLow: true,
      entryZoneHigh: true,
      stopLoss: true,
      targetPrice: true,
      maxPositionSize: true,
      invalidationCondition: true,
      notes: true,
      status: true,
    },
    orderBy: { id: 'asc' as const },
  },
} as const

function normalizeReflection(value: string | null | undefined): string | null {
  const normalized = value?.trim()
  return normalized || null
}

export async function findDiaryReviewForUser(diaryId: bigint, userId: bigint) {
  const diary = await prisma.diary.findFirst({
    where: { id: diaryId, userId },
    select: REVIEW_DETAIL_SELECT,
  })

  if (!diary) throw Errors.diaryNotFound(String(diaryId))
  return diary
}

export async function saveStructuredReviewForUser(
  diaryId: bigint,
  userId: bigint,
  input: StructuredReviewInput,
) {
  await findDiaryReviewForUser(diaryId, userId)

  return prisma.diary.update({
    where: { id: diaryId },
    data: {
      reviewOutcome: input.reviewOutcome,
      reviewSummary: normalizeReflection(input.reviewSummary),
      reviewLearning: normalizeReflection(input.reviewLearning),
      reviewAdjustment: normalizeReflection(input.reviewAdjustment),
      reviewStatus: 'reviewed',
      reviewedAt: new Date(),
    },
    select: REVIEW_DETAIL_SELECT,
  })
}
