import prisma from '../../../lib/prisma'
import type { DiaryInput, Diary } from '~/types/diary'

export default defineEventHandler(async (event): Promise<Diary> => {
  const userId = event.context.user?.id

  if (!userId) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized'
    })
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody<DiaryInput>(event)

  if (!id) {
    throw createError({
      statusCode: 400,
      statusMessage: 'ID is required',
    })
  }

  if (!body.title) {
    throw createError({
      statusCode: 400,
      statusMessage: 'Title is required',
    })
  }

  const { title, content, date, transactions, alerts } = body

  try {
    // First verify ownership
    const existingDiary = await prisma.diary.findFirst({
      where: {
        id: BigInt(id),
        userId: userId
      }
    })

    if (!existingDiary) {
      throw createError({
        statusCode: 404,
        statusMessage: 'Diary not found',
      })
    }

    // Update diary and handle transactions and alerts
    // For transactions/alerts, we'll delete existing ones and create new ones for simplicity
    const diary = await prisma.$transaction(async (tx) => {
      // Delete existing transactions and alerts
      await tx.transaction.deleteMany({
        where: {
          diaryId: BigInt(id),
        },
      })
      await tx.alert.deleteMany({
        where: {
          diaryId: BigInt(id),
        },
      })

      // Update diary and create new transactions and alerts
      return await tx.diary.update({
        where: {
          id: BigInt(id),
        },
        data: {
          title,
          content,
          date: date ? new Date(date) : undefined,
          transactions: {
            create: transactions?.map((tx) => ({
              symbol: tx.symbol?.trim().toUpperCase(),
              type: tx.type,
              quantity: tx.quantity,
              price: tx.price,
              tradeDate: new Date(tx.trade_date || tx.tradeDate),
            })),
          },
          alerts: {
            create: alerts?.map((a) => ({
              message: a.message,
              triggerAt: new Date(a.trigger_at || a.triggerAt),
            })),
          },
        },
        include: {
          transactions: true,
          alerts: true,
        },
      })
    })

    console.log('[API] Diary updated:', diary.id, 'for user:', userId)
    return diary as Diary
  } catch (error) {
    console.error('Error updating diary:', error)
    throw createError({
      statusCode: 500,
      statusMessage: 'Failed to update diary',
    })
  }
})
