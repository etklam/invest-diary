import prisma from '~/lib/prisma'
import { getUtcDayRange } from '~/lib/dates/normalize'

export interface DiaryActivityDay {
  date: string
  diaryId: bigint
  alertCount: number
  transactionCount: number
}

export async function getDiaryActivityForUser(
  userId: bigint,
  dateFrom: string,
  dateTo: string,
): Promise<DiaryActivityDay[]> {
  // Diary.date stores a normalized civil date at UTC noon. The user's
  // timezone selects the requested calendar range, but must not be applied
  // to the stored noon instant when producing the date key.
  const start = getUtcDayRange(dateFrom).startOfDayUtc
  const endOfDay = getUtcDayRange(dateTo).endOfDayUtc
  const end = new Date(endOfDay.getTime() + 1)
  const rows = await prisma.diary.findMany({
    where: { userId, date: { gte: start, lt: end } },
    orderBy: [{ date: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      date: true,
      _count: {
        select: {
          transactions: true,
          alerts: { where: { isDismissed: false } },
        },
      },
    },
  })

  const activity = new Map<string, DiaryActivityDay>()
  for (const row of rows) {
    const date = row.date.toISOString().slice(0, 10)
    const previous = activity.get(date)
    if (previous) {
      previous.alertCount += row._count.alerts
      previous.transactionCount += row._count.transactions
      continue
    }

    activity.set(date, {
      date,
      diaryId: row.id,
      alertCount: row._count.alerts,
      transactionCount: row._count.transactions,
    })
  }

  return Array.from(activity.values())
}
