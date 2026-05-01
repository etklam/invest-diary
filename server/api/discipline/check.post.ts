import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'

interface CheckItem {
  disciplineId: string | null
  passed: boolean
}

interface CheckBody {
  diaryId?: string
  checks: CheckItem[]
  note?: string
}

/**
 * POST /api/discipline/check
 * 記錄一次紀律自我檢查結果
 *
 * Body:
 *   diaryId?      - 關聯的日記 ID（字串，可選）
 *   checks        - 每個紀律的檢查結果 [{ disciplineId, passed }]
 *                   disciplineId 可為 null（代表「整體自我評估」，不綁特定紀律）
 *   note?         - 附加說明（可選）
 *
 * Response:
 *   { created: number }
 */
export default defineEventHandler(async (event) => {
  const log = logger.discipline.withRequestId(event.context.requestId)
  const user = requireUser(event)
  const userId = BigInt(user.id)

  const body = await readBody<CheckBody>(event)

  if (!body?.checks || !Array.isArray(body.checks) || body.checks.length === 0) {
    throw createError({ statusCode: 400, statusMessage: 'checks is required and must be a non-empty array' })
  }

  if (body.checks.length > 50) {
    throw createError({ statusCode: 400, statusMessage: 'checks cannot exceed 50 items' })
  }

  const diaryId = body.diaryId ? BigInt(body.diaryId) : null

  // 如果提供了 diaryId，驗證該日記屬於此用戶
  if (diaryId !== null) {
    const diary = await prisma.diary.findFirst({
      where: { id: diaryId, userId },
      select: { id: true },
    })
    if (!diary) {
      throw createError({ statusCode: 403, statusMessage: 'Diary not found or access denied' })
    }
  }

  // 批次建立所有 check 記錄
  const data = body.checks.map((item) => ({
    userId,
    diaryId,
    disciplineId: item.disciplineId ? BigInt(item.disciplineId) : null,
    passed: item.passed,
    note: body.note ?? null,
  }))

  const result = await prisma.disciplineCheck.createMany({ data })

  return { created: result.count }
})
