import prisma from '../../lib/prisma'
import type { Prisma } from '@prisma/client'
import type { DiariesApiResponse } from '~/types/diary'
import { parseDiaryTags } from '~/lib/diary-tags'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { requireUser } from '~/server/utils/auth'
import { parsePagination, parsePositiveInt, parseSearchQuery, parseDiarySortOption } from '~/server/utils/query-params'
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
    const search = parseSearchQuery(query.search)
    const orderBy = parseDiarySortOption(query.sortBy)

    // Parse date range (YYYY-MM-DD → UTC day boundaries)
    let dateFrom: Date | undefined
    let dateTo: Date | undefined
    if (typeof query.dateFrom === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.dateFrom)) {
      const [y, m, d] = query.dateFrom.split('-').map(Number)
      dateFrom = new Date(Date.UTC(y!, m! - 1, d!, 0, 0, 0, 0))
    }
    if (typeof query.dateTo === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(query.dateTo)) {
      const [y, m, d] = query.dateTo.split('-').map(Number)
      dateTo = new Date(Date.UTC(y!, m! - 1, d!, 23, 59, 59, 999))
    }

    const where: Prisma.DiaryWhereInput = { userId }

    // Days filter (legacy — uses createdAt)
    if (days !== undefined && days > 0) {
      const since = new Date()
      since.setDate(since.getDate() - days)
      where.createdAt = { gte: since }
    }

    // Search filter (case-insensitive contains on title + content)
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }

    // Date range filter (uses diary date field)
    if (dateFrom || dateTo) {
      where.date = {
        ...(dateFrom ? { gte: dateFrom } : {}),
        ...(dateTo ? { lte: dateTo } : {}),
      }
    }

    //效能優化：使用 select 只選擇必要欄位
    // - transactions 只選擇必要欄位（不需要 diaryId, createdAt）
    // - diary 不載入完整 content（列表頁不需要）
    const [diaries, total] = await Promise.all([
      prisma.diary.findMany({
        where,
        orderBy,
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
