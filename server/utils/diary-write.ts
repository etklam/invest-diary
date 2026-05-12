import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import type { DiaryInput, Diary, TransactionInput } from '~/types/diary'
import { getUtcDayRange, toUtcNoonDate } from '~/lib/diary-date'
import { normalizeDiaryTags, parseDiaryTags, stringifyDiaryTags } from '~/lib/diary-tags'
import { Errors } from '~/lib/errors/factory'
import { validateTransactions } from '~/lib/transactions/validate'
import { attachDiaryTags } from '~/server/utils/diary-response'

/**
 * Normalize a string-or-Date input into a native Date.
 * The PUT handler previously duplicated this — now it lives here only.
 */
export function toInputDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

// ---- Transaction diff types and pure function ----

export interface TransactionWriteData {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Prisma.Decimal | number
  price: Prisma.Decimal | number
  tradeDate: Date
  notes: string | null
  strategy: string | null
  emotion: string | null
}

export interface ResolvedTransactionUpdate {
  id: bigint
  data: TransactionWriteData
}

export interface TransactionDiffResult {
  toCreate: TransactionWriteData[]
  toUpdate: ResolvedTransactionUpdate[]
}

/**
 * Separate incoming transactions into "to create" (no DB id) and
 * "to update" (has a DB id that should be preserved).
 *
 * Pure function — no I/O, no Prisma dependency.
 */
export function diffTransactions(
  incoming: TransactionInput[] | undefined,
): TransactionDiffResult {
  const toCreate: TransactionWriteData[] = []
  const toUpdate: ResolvedTransactionUpdate[] = []

  for (const t of incoming ?? []) {
    const data: TransactionWriteData = {
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
      toUpdate.push({ id: BigInt(t.id), data })
    } else {
      toCreate.push(data)
    }
  }

  return { toCreate, toUpdate }
}

export interface CreateDiaryForUserInput {
  userId: string | bigint
  body: DiaryInput & { appendToToday?: boolean }
  createdVia?: 'WEB' | 'API_KEY' | 'TELEGRAM_BOT'
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
          userId,
          symbol: tx.symbol?.trim().toUpperCase(),
          type: tx.type,
          quantity: tx.quantity,
          price: tx.price,
          tradeDate: toInputDate(tx.trade_date ?? tx.tradeDate ?? new Date()),
          notes: tx.notes ?? null,
          strategy: tx.strategy ?? null,
          emotion: tx.emotion ?? null,
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

// ---- Update diary ----

export interface UpdateDiaryForUserInput {
  userId: string | bigint
  diaryId: string | bigint
  body: DiaryInput
}

/**
 * Update an existing diary using diff-based transaction upsert.
 *
 * Transaction strategy:
 * - Incoming transactions with a DB id → update (preserve stable ID)
 * - Incoming transactions without id → create
 * - Existing DB transactions not in payload → delete
 * - Alerts: delete-all + recreate (alerts don't need stable IDs yet)
 */
export async function updateDiaryForUser(input: UpdateDiaryForUserInput): Promise<Diary> {
  const userId = typeof input.userId === 'bigint' ? input.userId : BigInt(input.userId)
  const diaryId = typeof input.diaryId === 'bigint' ? input.diaryId : BigInt(input.diaryId)
  const { body } = input

  // --- Validation ---

  if (!body.title) {
    throw Errors.validationError([{ field: 'title', message: 'Title is required' }])
  }

  const transactionError = validateTransactions(body.transactions)
  if (transactionError) {
    throw Errors.validationError([{ field: 'transactions', message: transactionError }])
  }

  // --- Ownership check ---

  const existingDiary = await prisma.diary.findFirst({
    where: { id: diaryId },
  })

  if (!existingDiary) {
    throw Errors.diaryNotFound(diaryId.toString())
  }

  if (existingDiary.userId?.toString() !== userId.toString()) {
    throw Errors.diaryAccessDenied()
  }

  // --- Diff transactions ---

  const { toCreate, toUpdate } = diffTransactions(body.transactions)
  const updateIds = toUpdate.map((t) => t.id)

  // --- Persist inside a Prisma transaction ---

  const { title, content, date, alerts, tags } = body

  const diary = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    // Delete transactions that are no longer in the payload
    await tx.transaction.deleteMany({
      where: {
        diaryId,
        id: { notIn: updateIds.length > 0 ? updateIds : [BigInt(0)] },
      },
    })

    // Update existing transactions (preserve stable IDs)
    for (const { id, data } of toUpdate) {
      const updated = await tx.transaction.updateMany({
        where: { id, diaryId },
        data,
      })
      if (updated.count === 0) {
        throw Errors.validationError([
          { field: 'transactions', message: `Transaction ${id.toString()} not found in this diary` },
        ])
      }
    }

    // Create new transactions
    for (const data of toCreate) {
      await tx.transaction.create({
        data: { ...data, diaryId, userId },
      })
    }

    // Alerts: delete-all + recreate
    await tx.alert.deleteMany({ where: { diaryId } })

    // Update the diary record
    return await tx.diary.update({
      where: { id: diaryId },
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

  return attachDiaryTags(diary as Diary)
}
