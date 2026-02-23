import prisma from '../../../lib/prisma'
import type { DiaryInput, Diary } from '~/types/diary'
import { logger } from '~/lib/logger'
import { Errors, AppError } from '~/lib/errors/factory'

export default defineEventHandler(async (event): Promise<Diary> => {
  const log = logger.diary.withRequestId(event.context.requestId)
  const userId = event.context.user?.id

  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const id = getRouterParam(event, 'id')
  const body = await readBody<DiaryInput>(event)

  if (!id) {
    throw Errors.validationError([{ field: 'id', message: 'ID is required' }]).toH3Error()
  }

  if (!body.title) {
    throw Errors.validationError([{ field: 'title', message: 'Title is required' }]).toH3Error()
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
      throw Errors.diaryNotFound(id)
    }

    // Update diary and handle transactions and alerts
    // For transactions/alerts, we'll delete existing ones and create new ones for simplicity
    const diary = await prisma.$transaction(async (tx: any) => {
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
              tradeDate: new Date((tx.trade_date ?? tx.tradeDate) as any),
            })),
          },
          alerts: {
            create: alerts?.map((a) => ({
              message: a.message,
              triggerAt: new Date((a.trigger_at ?? a.triggerAt) as any),
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
    return diary as Diary
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code })
      throw error.toH3Error()
    }
    log.error('Failed to update diary', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
