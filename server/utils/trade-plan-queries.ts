import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'

export const tradePlanInclude = {
  diary: {
    select: {
      id: true,
      title: true,
      date: true,
    },
  },
} satisfies Prisma.TradePlanInclude

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
    throw Errors.diaryAccessDenied()
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
    throw Errors.notFound('Trade plan not found')
  }

  return tradePlan
}

export async function findTradePlanDetailForUser(id: bigint, userId: bigint) {
  const tradePlan = await prisma.tradePlan.findFirst({
    where: { id, userId },
  })

  if (!tradePlan) throw Errors.notFound('Trade plan not found')
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
