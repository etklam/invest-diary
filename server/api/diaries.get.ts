import prisma from '../../lib/prisma'
import type { Prisma } from '@prisma/client'
import type { DiariesApiResponse } from '~/types/diary'
import { parseDiaryTags } from '~/lib/diary-tags'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import { parsePagination, parsePositiveInt } from '~/server/utils/query-params'
import { serialize } from '~/server/utils/serialize'

type DiaryListItem = Awaited<ReturnType<typeof prisma.diary.findMany>>[number]
type DiaryAlertItem = DiaryListItem['alerts'][number]
type DiaryTransactionItem = DiaryListItem['transactions'][number]

export default defineEventHandler(async (event): Promise<DiariesApiResponse> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    const userId = BigInt(user.id)

    const query = getQuery(event)
    const { page, limit, skip } = parsePagination(query)
    const days = parsePositiveInt(query.days)

    const where: Prisma.DiaryWhereInput = { userId }
    if (days !== undefined && days > 0) {
      const since = new Date()
      since.setDate(since.getDate() - days)
      where.createdAt = { gte: since }
    }

    //效能優化：使用 select 只選擇必要欄位
    // - transactions 只選擇必要欄位（不需要 diaryId, createdAt）
    // - diary 不載入完整 content（列表頁不需要）
    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          userId: true,
          title: true,
          content: true,
          tagsString: true,
          createdVia: true,
          createdByLabel: true,
          date: true,
          createdAt: true,
          updatedAt: true,
          alerts: {
            where: { isDismissed: false },
            select: {
              id: true,
              message: true,
              triggerAt: true,
              isDismissed: true
            }
          },
          transactions: {
            select: {
              id: true,
              symbol: true,
              type: true,
              quantity: true,
              price: true,
              tradeDate: true,
            }
          }
        },
        skip,
        take: limit,
      }),
      prisma.diary.count({ where })
    ])

    // Attach parsed tags (BigInt handled by serialize)
    const shapedDiaries = diaries.map((d: DiaryListItem) => ({
      ...d,
      tags: parseDiaryTags(d.tagsString),
    }))

    return serialize({
      data: shapedDiaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    })
  } catch (error: unknown) {
    handleApiError(error, log)
  }
})
