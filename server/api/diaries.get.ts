import prisma from '../../lib/prisma'
import type { Prisma } from '@prisma/client'
import type { DiariesApiResponse } from '~/types/diary'
import { parseDiaryTags } from '~/lib/diary-tags'
import { logger } from '~/lib/logger'
import { Errors, AppError } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'

type DiaryListItem = Awaited<ReturnType<typeof prisma.diary.findMany>>[number]
type DiaryAlertItem = DiaryListItem['alerts'][number]
type DiaryTransactionItem = DiaryListItem['transactions'][number]

export default defineEventHandler(async (event): Promise<DiariesApiResponse> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    const userId = BigInt(user.id)

    const query = getQuery(event)
    const page = Number(query.page) || 1
    const limit = Number(query.limit) || 20
    const skip = (page - 1) * limit
    const days = Number(query.days)

    const where: Prisma.DiaryWhereInput = { userId }
    if (Number.isFinite(days) && days > 0) {
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
          title: true,
          content: true,
          tagsString: true,
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

    // 將 BigInt 轉為 string，避免本機 Nitro JSON 序列化 500 error
    const safeDiaries = diaries.map((d: DiaryListItem) => ({
      ...d,
      id: d.id.toString(),
      tags: parseDiaryTags(d.tagsString),
      alerts: d.alerts.map((a: DiaryAlertItem) => ({ ...a, id: a.id.toString() })),
      transactions: d.transactions.map((t: DiaryTransactionItem) => ({
        ...t,
        id: t.id.toString(),
      })),
    }))

    return {
      data: safeDiaries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    }
  } catch (error: unknown) {
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    log.error('Failed to fetch diaries', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
