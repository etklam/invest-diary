import type { Prisma } from '@prisma/client'
import prisma from '../../../lib/prisma'
import type { DiaryInput, Diary } from '~/types/diary'
import { logger } from '~/lib/logger'
import { Errors, AppError } from '~/lib/errors/factory'
import { toUtcNoonDate } from '~/lib/diary-date'
import { stringifyDiaryTags } from '~/lib/diary-tags'
import { validateTransactions } from '~/lib/transactions/validate'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { attachDiaryTags } from '~/server/utils/diary-response'

function toInputDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export default defineEventHandler(async (event): Promise<Diary> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const diaryId = parsePositiveBigIntParam(event, 'id')
  const diaryIdString = diaryId.toString()
  const body = await readBody<DiaryInput>(event)

  if (!body.title) {
    throw Errors.validationError([{ field: 'title', message: 'Title is required' }]).toH3Error()
  }

  const { title, content, date, transactions, alerts, tags } = body
  const transactionError = validateTransactions(transactions)
  if (transactionError) {
    throw Errors.validationError([{ field: 'transactions', message: transactionError }]).toH3Error()
  }

  try {
    // First verify ownership
    const existingDiary = await prisma.diary.findFirst({
      where: {
        id: diaryId,
      }
    })

    if (!existingDiary) {
      throw Errors.diaryNotFound(diaryIdString)
    }

    if (existingDiary.userId?.toString() !== userId.toString()) {
      throw Errors.diaryAccessDenied()
    }

    // Update diary and handle transactions and alerts
    // For transactions/alerts, we'll delete existing ones and create new ones for simplicity
    const diary = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // Delete existing transactions and alerts
      await tx.transaction.deleteMany({
        where: {
          diaryId: diaryId,
        },
      })
      await tx.alert.deleteMany({
        where: {
          diaryId: diaryId,
        },
      })

      // Update diary and create new transactions and alerts
      return await tx.diary.update({
        where: {
          id: diaryId,
        },
        data: {
          title,
          content,
          tagsString: tags !== undefined ? stringifyDiaryTags(tags) : undefined,
          date: date ? toUtcNoonDate(date) : undefined,
          transactions: {
            create: transactions?.map((tx) => ({
              symbol: tx.symbol?.trim().toUpperCase(),
              type: tx.type,
              quantity: tx.quantity,
              price: tx.price,
              tradeDate: toInputDate(tx.trade_date ?? tx.tradeDate ?? new Date()),
            })),
          },
          alerts: {
            create: alerts?.map((a) => ({
              message: a.message,
              triggerAt: toUtcNoonDate(a.trigger_at ?? a.triggerAt ?? new Date()),
            })),
          },
        },
        include: {
          transactions: true,
          alerts: true,
        },
      })
    })

    log.info('Diary updated', { diaryId: diary.id.toString(), userId })
    return attachDiaryTags(diary as Diary)
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code })
      throw error.toH3Error()
    }
    log.error('Failed to update diary', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
