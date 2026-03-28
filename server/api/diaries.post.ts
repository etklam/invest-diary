import prisma from '~/lib/prisma'
import type { DiaryInput, Diary } from '~/types/diary'
import { getUtcDayRange, toUtcNoonDate } from '~/lib/diary-date'
import { normalizeDiaryTags, parseDiaryTags, stringifyDiaryTags } from '~/lib/diary-tags'
import { Errors, AppError } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { validateTransactions } from '~/lib/transactions/validate'
import { attachDiaryTags } from '~/server/utils/diary-response'

export default defineEventHandler(async (event): Promise<Diary> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const body = await readBody<DiaryInput & { appendToToday?: boolean }>(event)

  if (!body.title) {
    throw Errors.validationError([{ field: 'title', message: 'Title is required' }]).toH3Error()
  }

  if (!body.content) {
    throw Errors.validationError([{ field: 'content', message: 'Content is required' }]).toH3Error()
  }

  const { title, content, date, transactions, alerts, appendToToday, tags } = body

  const transactionError = validateTransactions(transactions)
  if (transactionError) {
    throw Errors.validationError([{ field: 'transactions', message: transactionError }]).toH3Error()
  }

  try {
    const diaryDate = date ? toUtcNoonDate(date) : toUtcNoonDate(new Date())
    const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(diaryDate)

    const existingDiary = await prisma.diary.findFirst({
      where: {
        userId: userId,
        date: {
          gte: startOfDayUtc,
          lte: endOfDayUtc,
        },
      },
    })

    if (existingDiary && appendToToday) {
      const separator = '\n\n---\n\n'
      const mergedTags = tags?.length
        ? normalizeDiaryTags([...parseDiaryTags(existingDiary.tagsString), ...tags])
        : null
      const updatedDiary = await prisma.diary.update({
        where: { id: existingDiary.id },
        data: {
          content: `${existingDiary.content ?? ''}${separator}${content}`,
          ...(mergedTags ? { tagsString: stringifyDiaryTags(mergedTags) } : {}),
        },
        include: {
          transactions: true,
          alerts: true,
        },
      })

      return attachDiaryTags(updatedDiary as Diary)
    }

    if (existingDiary) {
      const errorDate = date ? (typeof date === 'string' ? date : date.toISOString()) : diaryDate.toISOString()
      throw Errors.diaryAlreadyExists(errorDate)
    }

    const diary = await prisma.diary.create({
      data: {
        userId: userId,
        title,
        content,
        tagsString: stringifyDiaryTags(tags),
        date: diaryDate,
        transactions: {
          create: transactions?.map((tx) => ({
            symbol: tx.symbol,
            type: tx.type,
            quantity: tx.quantity,
            price: tx.price,
            tradeDate: new Date((tx.trade_date ?? tx.tradeDate) as any),
          })),
        },
        alerts: {
          create: alerts?.map((a) => ({
            message: a.message,
            triggerAt: toUtcNoonDate((a.trigger_at ?? a.triggerAt) as any),
          })),
        },
      },
      include: {
        transactions: true,
        alerts: true,
      },
    })

    log.info('Diary created', { diaryId: diary.id.toString(), userId })
    return attachDiaryTags(diary as Diary)
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code, userId })
      throw error.toH3Error()
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    log.error('Error creating diary', { userId, error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
