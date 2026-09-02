import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'

export const tradePlanInclude = {
  diary: {
    select: {
      id: true,
      userId: true,
      title: true,
      date: true,
      reviewStatus: true,
      reviewOutcome: true,
      _count: { select: { transactions: true } },
    },
  },
} satisfies Prisma.TradePlanInclude

type TradePlanWithDiary = {
  diary?: ({ userId?: bigint | number | string } & Record<string, unknown>) | null
}

/**
 * Legacy rows can predate the owner invariant migration. Never expose a
 * linked Diary unless its owner still matches the Trade Plan owner.
 */
export function sanitizeTradePlanDiary<T extends TradePlanWithDiary>(tradePlan: T, userId: bigint): T {
  if (!tradePlan.diary) return tradePlan

  const { userId: diaryUserId, ...diary } = tradePlan.diary
  if (diaryUserId !== undefined && String(diaryUserId) !== String(userId)) {
    return { ...tradePlan, diary: null } as T
  }

  return { ...tradePlan, diary } as T
}

export async function assertDiaryBelongsToUser(diaryId: bigint | null | undefined, userId: bigint) {
  if (!diaryId) return

  const diary = await prisma.diary.findFirst({
    where: {
      id: diaryId,
      userId,
    },
    select: { id: true },
  })

  if (!diary) {
    throw Errors.diaryNotFound(String(diaryId)).toH3Error()
  }
}

export async function findTradePlanForUser(id: bigint, userId: bigint) {
  const tradePlan = await prisma.tradePlan.findFirst({
    where: {
      id,
      userId,
    },
    include: tradePlanInclude,
  })

  if (!tradePlan) {
    throw Errors.tradePlanNotFound().toH3Error()
  }

  return sanitizeTradePlanDiary(tradePlan, userId)
}

export async function findTradePlanDetailForUser(id: bigint, userId: bigint) {
  const tradePlan = await prisma.tradePlan.findFirst({
    where: { id, userId },
  })

  if (!tradePlan) throw Errors.tradePlanNotFound().toH3Error()
  if (!tradePlan.diaryId) return { ...tradePlan, diary: null }

  const diary = await prisma.diary.findFirst({
    where: { id: tradePlan.diaryId, userId },
    select: {
      id: true,
      title: true,
      date: true,
      reviewStatus: true,
      reviewOutcome: true,
      _count: { select: { transactions: true } },
    },
  })

  return {
    ...tradePlan,
    diary: diary
      ? {
          id: diary.id,
          title: diary.title,
          date: diary.date,
          reviewStatus: diary.reviewStatus,
          reviewOutcome: diary.reviewOutcome,
          transactionCount: diary._count.transactions,
        }
      : null,
  }
}
