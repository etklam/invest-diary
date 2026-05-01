import type { Prisma } from '@prisma/client'
import prisma from '../../../lib/prisma'
import type { DiaryInput, Diary } from '~/types/diary'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'
import { toUtcNoonDate } from '~/lib/diary-date'
import { stringifyDiaryTags } from '~/lib/diary-tags'
import { validateTransactions } from '~/lib/transactions/validate'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { attachDiaryTags } from '~/server/utils/diary-response'
import { handleApiError } from '~/server/utils/error-handler'

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

    // Update diary using diff-based upsert for transactions to preserve stable IDs.
    // This prevents DisciplineCheck / TradeReview references from breaking on each edit.
    const diary = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // --- Transactions: diff-based upsert ---
      // Incoming transactions with a known DB id → update (preserve the ID)
      // Incoming transactions without id → create (new rows)
      // Existing DB transactions not in the payload → delete
      const incomingTxs = transactions ?? []
      const incomingIds = incomingTxs
        .filter((t) => t.id != null)
        .map((t) => BigInt(t.id!))

      // Delete transactions that are no longer in the payload
      await tx.transaction.deleteMany({
        where: {
          diaryId,
          id: { notIn: incomingIds.length > 0 ? incomingIds : [BigInt(0)] },
        },
      })

      // Update existing and create new transactions
      for (const t of incomingTxs) {
        const txData = {
          symbol: t.symbol?.trim().toUpperCase(),
          type: t.type,
          quantity: t.quantity,
          price: t.price,
          tradeDate: toInputDate(t.trade_date ?? t.tradeDate ?? new Date()),
          notes: t.notes ?? null,
          strategy: t.strategy ?? null,
          emotion: t.emotion ?? null,
        }
        if (t.id != null) {
          // Guard ownership: only allow updating transactions that belong to this diary.
          const updated = await tx.transaction.updateMany({
            where: { id: BigInt(t.id), diaryId },
            data: txData,
          })
          if (updated.count === 0) {
            throw Errors.validationError([
              {
                field: 'transactions',
                message: `Transaction ${String(t.id)} not found in this diary`,
              },
            ])
          }
        } else {
          await tx.transaction.create({
            data: { ...txData, diaryId, userId: BigInt(userId) },
          })
        }
      }

      // --- Alerts: keep simple deleteMany + recreate (alerts don't need stable IDs yet) ---
      await tx.alert.deleteMany({
        where: { diaryId },
      })

      // Update diary (without nested transaction/alert write, handled above)
      return await tx.diary.update({
        where: {
          id: diaryId,
        },
        data: {
          title,
          content,
          tagsString: tags !== undefined ? stringifyDiaryTags(tags) : undefined,
          date: date ? toUtcNoonDate(date) : undefined,
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
    handleApiError(error, log)
  }
})
