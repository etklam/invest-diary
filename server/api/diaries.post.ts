import prisma from '~/lib/prisma'
import type { DiaryInput, Diary } from '~/types/diary'
import { getUtcDayRange, toUtcNoonDate } from '~/lib/diary-date'

export default defineEventHandler(async (event): Promise<Diary> => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const body = await readBody<DiaryInput & { appendToToday?: boolean }>(event)

  if (!body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required',
    })
  }

  if (!body.content) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Content is required',
    })
  }

  const { title, content, date, transactions, alerts, appendToToday } = body

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
      throw createError({
        statusCode: 409,
        statusMessage: 'Diary already exists for this date',
        data: {
          existingDiaryId: existingDiary.id.toString(),
          date: date,
        },
      })
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
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error
    }
    console.error('Error creating diary:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to create diary',
    })
  }
})
