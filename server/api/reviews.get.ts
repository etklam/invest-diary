import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { getUserDayRange } from '~/lib/dates/user-tz'
import { requireUser } from '~/server/utils/auth'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

type ReviewDiary = {
  id: bigint
  title: string
  date: Date
  thesis: string | null
  risk: string | null
  reviewDueAt: Date | null
  reviewStatus: string | null
  reviewedAt: Date | null
}

const reviewSelect = {
  id: true,
  title: true,
  date: true,
  thesis: true,
  risk: true,
  reviewDueAt: true,
  reviewStatus: true,
  reviewedAt: true,
} satisfies Prisma.DiarySelect

export default defineEventHandler(async (event) => {
  const log = logger.diary.withRequestId(event.context.requestId)

  try {
    const user = requireUser(event)
    const userId = BigInt(user.id)
    const persistedUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timeZone = persistedUser?.timezone || 'Asia/Taipei'
    // half-open [start, end): start = user-local today 00:00 UTC, end = next-day 00:00 UTC
    const { start: todayStart, end: tomorrowStart } = getUserDayRange(new Date(), timeZone)

    const baseOpenWhere: Prisma.DiaryWhereInput = {
      userId,
      NOT: { reviewStatus: 'reviewed' },
    }

    const [unscheduled, overdue, today, upcoming, completed] = await Promise.all([
      prisma.diary.findMany({
        where: {
          ...baseOpenWhere,
          reviewDueAt: null,
          reviewStatus: 'pending',
        },
        select: reviewSelect,
        orderBy: { date: 'desc' },
      }),
      prisma.diary.findMany({
        where: {
          ...baseOpenWhere,
          reviewDueAt: { lt: todayStart },
        },
        select: reviewSelect,
        orderBy: { reviewDueAt: 'asc' },
      }),
      prisma.diary.findMany({
        where: {
          ...baseOpenWhere,
          // half-open: [todayStart, tomorrowStart)
          reviewDueAt: { gte: todayStart, lt: tomorrowStart },
        },
        select: reviewSelect,
        orderBy: { reviewDueAt: 'asc' },
      }),
      prisma.diary.findMany({
        where: {
          ...baseOpenWhere,
          reviewDueAt: { gte: tomorrowStart },
        },
        select: reviewSelect,
        orderBy: { reviewDueAt: 'asc' },
      }),
      prisma.diary.findMany({
        where: {
          userId,
          reviewStatus: 'reviewed',
        },
        select: reviewSelect,
        orderBy: { reviewedAt: 'desc' },
        take: 50,
      }),
    ])

    const normalize = (items: ReviewDiary[]) => items.map(item => ({
      ...item,
      reviewStatus: item.reviewStatus || 'none',
    }))

    return serialize({
      unscheduled: normalize(unscheduled as ReviewDiary[]),
      overdue: normalize(overdue as ReviewDiary[]),
      today: normalize(today as ReviewDiary[]),
      upcoming: normalize(upcoming as ReviewDiary[]),
      completed: normalize(completed as ReviewDiary[]),
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
