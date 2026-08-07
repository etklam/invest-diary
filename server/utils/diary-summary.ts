import prisma from '~/lib/prisma'
import { formatYmdInTimezone } from '~/lib/dates/format'
import { getUtcDayRange } from '~/lib/dates/normalize'

export interface DiarySummary {
  global: {
    totalDiaries: number
    totalOpenAlerts: number
    diariesWithAlerts: number
    totalTransactions: number
    diariesWithTransactions: number
  }
  currentWeek: {
    totalDiaries: number
    startDate: string
    endDateExclusive: string
  }
  latestDiary: {
    id: bigint
    title: string
    content: string | null
    date: Date
    createdAt: Date
  } | null
  reviewCandidates: Array<{
    id: bigint
    title: string
    date: Date
    thesis: string | null
    risk: string | null
    reviewStatus: string | null
  }>
}

function shiftCivilDate(ymd: string, days: number): string {
  const [year, month, day] = ymd.split('-').map(Number)
  const date = new Date(0)
  date.setUTCFullYear(year!, month! - 1, day!)
  date.setUTCDate(date.getUTCDate() + days)
  return [date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate()]
    .map((part, index) => index === 0 ? String(part).padStart(4, '0') : String(part).padStart(2, '0'))
    .join('-')
}

function currentWeekDates(now: Date, timeZone: string): { start: string; endExclusive: string } {
  const today = formatYmdInTimezone(now, timeZone)
  const weekday = new Date(`${today}T00:00:00Z`).getUTCDay()
  const start = shiftCivilDate(today, -weekday)
  return { start, endExclusive: shiftCivilDate(start, 7) }
}

/** Summary is intentionally independent from the current list page. */
export async function getDiarySummaryForUser(
  userId: bigint,
  timeZone: string,
  now = new Date(),
): Promise<DiarySummary> {
  const week = currentWeekDates(now, timeZone)
  // Diary.date is a civil-date encoding (UTC noon), not an event instant.
  // Use the UTC day boundaries for the query after deriving the week in the
  // user's timezone; otherwise UTC+14 users can lose the last day of a week.
  const weekStart = getUtcDayRange(week.start).startOfDayUtc
  const nextWeekStart = getUtcDayRange(week.endExclusive).startOfDayUtc
  const weekEnd = new Date(Math.min(now.getTime(), nextWeekStart.getTime()))

  const [
    totalDiaries,
    totalOpenAlerts,
    diariesWithAlerts,
    totalTransactions,
    diariesWithTransactions,
    currentWeekTotal,
    latestDiary,
    reviewCandidates,
  ] = await Promise.all([
    prisma.diary.count({ where: { userId } }),
    prisma.alert.count({ where: { isDismissed: false, diary: { userId } } }),
    prisma.diary.count({ where: { userId, alerts: { some: { isDismissed: false } } } }),
    prisma.transaction.count({ where: { diary: { userId } } }),
    prisma.diary.count({ where: { userId, transactions: { some: {} } } }),
    prisma.diary.count({ where: { userId, date: { gte: weekStart, lt: weekEnd } } }),
    prisma.diary.findFirst({
      where: { userId },
      orderBy: [{ date: 'desc' }, { id: 'desc' }],
      select: { id: true, title: true, content: true, date: true, createdAt: true },
    }),
    prisma.diary.findMany({
      where: { userId, reviewStatus: 'pending' },
      orderBy: [{ reviewDueAt: 'asc' }, { date: 'desc' }, { id: 'desc' }],
      take: 5,
      select: { id: true, title: true, date: true, thesis: true, risk: true, reviewStatus: true },
    }),
  ])

  return {
    global: {
      totalDiaries,
      totalOpenAlerts,
      diariesWithAlerts,
      totalTransactions,
      diariesWithTransactions,
    },
    currentWeek: {
      totalDiaries: currentWeekTotal,
      startDate: week.start,
      endDateExclusive: week.endExclusive,
    },
    latestDiary,
    reviewCandidates,
  }
}
