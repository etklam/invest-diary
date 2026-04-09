import prisma from '~/lib/prisma'
import type { DiaryInput, Diary } from '~/types/diary'
import { getUtcDayRange, toUtcNoonDate } from '~/lib/diary-date'
import { normalizeDiaryTags, parseDiaryTags, stringifyDiaryTags } from '~/lib/diary-tags'
import { Errors } from '~/lib/errors/factory'
import { validateTransactions } from '~/lib/transactions/validate'
import { attachDiaryTags } from '~/server/utils/diary-response'

function toInputDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export interface CreateDiaryForUserInput {
  userId: string | bigint
  body: DiaryInput & { appendToToday?: boolean }
  createdVia?: 'WEB' | 'API_KEY'
  createdByLabel?: string | null
}

export async function createDiaryForUser(input: CreateDiaryForUserInput): Promise<Diary> {
  const userId = typeof input.userId === 'bigint' ? input.userId : BigInt(input.userId)
  const { body } = input

  if (!body.title) {
    throw Errors.validationError([{ field: 'title', message: 'Title is required' }])
  }

  if (!body.content) {
    throw Errors.validationError([{ field: 'content', message: 'Content is required' }])
  }

  const { title, content, date, transactions, alerts, appendToToday, tags } = body

  const transactionError = validateTransactions(transactions)
  if (transactionError) {
    throw Errors.validationError([{ field: 'transactions', message: transactionError }])
  }

  const diaryDate = date ? toUtcNoonDate(date) : toUtcNoonDate(new Date())
  const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(diaryDate)

  const existingDiary = await prisma.diary.findFirst({
    where: {
      userId,
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
      userId,
      title,
      content,
      tagsString: stringifyDiaryTags(tags),
      createdVia: input.createdVia ?? 'WEB',
      createdByLabel: input.createdByLabel ?? null,
      date: diaryDate,
      transactions: {
        create: transactions?.map((tx) => ({
          symbol: tx.symbol,
          type: tx.type,
          quantity: tx.quantity,
          price: tx.price,
          tradeDate: toInputDate(tx.trade_date ?? tx.tradeDate ?? new Date()),
        })),
      },
      alerts: {
        create: alerts?.map((alert) => ({
          message: alert.message,
          triggerAt: toUtcNoonDate(alert.trigger_at ?? alert.triggerAt ?? new Date()),
        })),
      },
    },
    include: {
      transactions: true,
      alerts: true,
    },
  })

  return attachDiaryTags(diary as Diary)
}
