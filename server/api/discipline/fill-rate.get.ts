import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'

/**
 * GET /api/discipline/fill-rate
 * 計算用戶的紀律檢查填寫率
 *
 * Query params:
 *   days  - 統計天數範圍（預設 30，最大 90）
 *
 * Response:
 *   { totalDiaries, checkedDiaries, fillRate }
 *   fillRate = checkedDiaries / totalDiaries * 100，若無日記則為 null
 */
export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const userId = BigInt(user.id)

  const query = getQuery(event)
  const days = Math.min(Number(query.days) || 30, 90)

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - days)

  // 查詢期間內的日記總數
  const totalDiaries = await prisma.diary.count({
    where: {
      userId,
      createdAt: { gte: cutoff },
    },
  })

  if (totalDiaries === 0) {
    return {
      totalDiaries: 0,
      checkedDiaries: 0,
      fillRate: null,
    }
  }

  // 查詢期間內有填寫 DisciplineCheck 的不重複日記數
  const checkedDiaryResult = await prisma.disciplineCheck.findMany({
    where: {
      userId,
      createdAt: { gte: cutoff },
      diaryId: { not: null },
    },
    select: { diaryId: true },
    distinct: ['diaryId'],
  })

  const checkedDiaries = checkedDiaryResult.length

  const fillRate = Math.round((checkedDiaries / totalDiaries) * 1000) / 10 // 一位小數 %

  return {
    totalDiaries,
    checkedDiaries,
    fillRate,
  }
})
