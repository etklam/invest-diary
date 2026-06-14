import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
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

const getTimeZoneParts = (date: Date, timeZone: string) => {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const part = (type: string) => Number(values.find(item => item.type === type)?.value)

  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    hour: part('hour') === 24 ? 0 : part('hour'),
    minute: part('minute'),
    second: part('second'),
  }
}

const getZonedTimeOffsetMs = (date: Date, timeZone: string) => {
  const parts = getTimeZoneParts(date, timeZone)
  const utcAtSecond = date.getTime() - date.getUTCMilliseconds()
  return Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) - utcAtSecond
}

const zonedDateTimeToUtc = (
  parts: { year: number; month: number; day: number; hour: number; minute: number; second: number; millisecond: number },
  timeZone: string,
) => {
  const utcGuess = new Date(Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute,
    parts.second,
    parts.millisecond,
  ))
  const offset = getZonedTimeOffsetMs(utcGuess, timeZone)
  const resolved = new Date(utcGuess.getTime() - offset)
  const resolvedOffset = getZonedTimeOffsetMs(resolved, timeZone)

  return new Date(utcGuess.getTime() - resolvedOffset)
}

const getZonedDayRange = (date: Date, timeZone: string) => {
  const { year, month, day } = getTimeZoneParts(date, timeZone)

  return {
    start: zonedDateTimeToUtc({ year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 }, timeZone),
    end: zonedDateTimeToUtc({ year, month, day, hour: 23, minute: 59, second: 59, millisecond: 999 }, timeZone),
  }
}

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
    const now = new Date()
    const { start: todayStart, end: todayEnd } = getZonedDayRange(now, timeZone)

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
          reviewDueAt: { gte: todayStart, lte: todayEnd },
        },
        select: reviewSelect,
        orderBy: { reviewDueAt: 'asc' },
      }),
      prisma.diary.findMany({
        where: {
          ...baseOpenWhere,
          reviewDueAt: { gt: todayEnd },
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
