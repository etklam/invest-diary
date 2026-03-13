import prisma from '~/lib/prisma'
import type { DiaryInput, Diary } from '~/types/diary'
import { getUtcDayRange, toUtcNoonDate } from '~/lib/diary-date'
import { Errors, AppError } from '~/lib/errors/factory'
import { validateTransactions } from '~/lib/transactions/validate'

export default defineEventHandler(async (event): Promise<Diary> => {
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

  const { title, content, date, transactions, alerts, appendToToday } = body

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
      const updatedDiary = await prisma.diary.update({
        where: { id: existingDiary.id },
        data: {
          content: existingDiary.content + separator + content,
        },
        include: {
          transactions: true,
          alerts: true,
        },
      })

      return updatedDiary as Diary
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

    console.log('[API] Diary created:', diary.id, 'for user:', userId)
    return diary as Diary
  } catch (error) {
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('Error creating diary:', error)
    throw Errors.internalError(error).toH3Error()
  }
})
