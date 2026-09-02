import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import {
  structuredReviewInputSchema,
  type StructuredReviewInput,
} from '~/lib/contracts/review'

// Compatibility exports for server callers; the contract definition lives in lib/contracts.
export { structuredReviewInputSchema }
export type { StructuredReviewInput }

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
      reviewStatus: 'REVIEWED',
      reviewedAt: new Date(),
    },
    select: REVIEW_DETAIL_SELECT,
  })
}
