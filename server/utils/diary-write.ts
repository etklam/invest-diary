import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import type { DiaryInput, Diary, TransactionInput } from '~/types/diary'
import { getUtcDayRange, toUtcNoonDate } from '~/lib/dates/normalize'
import { normalizeDiaryTags, parseDiaryTags, stringifyDiaryTags } from '~/lib/diary-tags'
import { Errors } from '~/lib/errors/factory'
import { attachDiaryMetadata } from '~/server/utils/diary-response'
import {
  normalizeDiaryStockSymbols,
  replaceDiaryStockContexts,
  unionDiaryStockContexts,
} from '~/server/utils/diary-stock-context'
import { persistAlerts, replaceAlerts } from '~/server/utils/alert-persistence'
import {
  calculateLedgerHoldings,
  validateTransactionLedger,
  validateTransactionValues,
  type HoldingsInput,
} from '~/lib/diary-authoring/validation'

/**
 * Normalize a string-or-Date input into a native Date.
 * The PUT handler previously duplicated this — now it lives here only.
 */
export function toInputDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

/**
 * 查使用者 timezone，供 recurring alert 序列計算使用。
 * 找不到（理論上不會）時回退 schema default 'Asia/Taipei'。
 */
async function resolveUserTimezone(
  tx: Prisma.TransactionClient,
  userId: bigint,
): Promise<string> {
  const user = await tx.user.findUnique({
    where: { id: userId },
    select: { timezone: true },
  })
  return user?.timezone ?? 'Asia/Taipei'
}

// ---- Shared validation ----

export interface DiaryValidationOptions {
  /** Baseline holdings at the target diary date. */
  initialHoldings?: HoldingsInput
  /** False means the caller deliberately has no reliable ledger context. */
  baselineAvailable?: boolean
}

/** Prisma's unique constraint error, kept structural so this module remains testable without a DB client. */
export function isUniqueConstraintError(error: unknown): boolean {
  return typeof error === 'object'
    && error !== null
    && 'code' in error
    && (error as { code?: unknown }).code === 'P2002'
}

function diaryDateLabel(date: Date): string {
  return date.toISOString().slice(0, 10)
}

/**
 * Validate diary input shared by both create and update.
 * Throws validation error if title is missing or transactions are invalid.
 */
export function validateDiaryInput(
  title: string | undefined,
  transactions: TransactionInput[] | undefined,
  options: DiaryValidationOptions = {},
): void {
  if (!title) {
    throw Errors.validationError([{ field: 'title', message: 'Title is required' }])
  }

  const valueError = validateTransactionValues(transactions ?? [], { requirePrice: true })
  if (valueError) {
    throw Errors.validationError([{
      field: `transactions.${valueError.index}.${valueError.field}`,
      message: valueError.message,
    }])
  }

  if (options.baselineAvailable === false) return

  const transactionError = validateTransactionLedger(
    options.initialHoldings,
    transactions ?? [],
  )?.message
  if (transactionError) {
    throw Errors.validationError([{ field: 'transactions', message: transactionError }])
  }
}

export interface DiaryLedgerBaselineTransaction {
  id: bigint
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: Prisma.Decimal | number | string
  price: Prisma.Decimal | number | string
  tradeDate: Date
}

/** Read the user's complete persisted ledger, optionally excluding one Diary. */
export async function readUserTransactionLedger(
  userId: bigint,
  excludeDiaryId?: bigint,
): Promise<DiaryLedgerBaselineTransaction[]> {
  return await prisma.transaction.findMany({
    where: {
      diary: { userId },
      ...(excludeDiaryId !== undefined ? { diaryId: { not: excludeDiaryId } } : {}),
    },
    select: {
      id: true,
      symbol: true,
      type: true,
      quantity: true,
      price: true,
      tradeDate: true,
    },
    orderBy: [{ tradeDate: 'asc' }, { id: 'asc' }],
  }) as DiaryLedgerBaselineTransaction[]
}

async function validateDiaryTransactionsForUser(
  userId: bigint,
  transactions: TransactionInput[],
  excludeDiaryId?: bigint,
): Promise<void> {
  const persistedRows = await readUserTransactionLedger(userId, excludeDiaryId)

  try {
    calculateLedgerHoldings({}, [...persistedRows, ...transactions])
  } catch (error) {
    const message = error instanceof Error ? error.message : '既有交易帳本無效'
    throw Errors.validationError([{ field: 'transactions', message }])
  }
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

function normalizeDecimalWrite(
  value: Prisma.Decimal | number | string,
  field: 'quantity' | 'price',
): Prisma.Decimal | number {
  const numberValue = Number(value)
  if (!Number.isFinite(numberValue) || numberValue <= 0) {
    throw Errors.validationError([{
      field: `transactions.${field}`,
      message: `${field} must be a finite number greater than 0`,
    }])
  }

  return typeof value === 'string' ? numberValue : value
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
 * Map a single TransactionInput to TransactionWriteData.
 * Shared by diffTransactions (update path) and createDiaryForUser (create path).
 */
export function mapTransactionWriteData(t: TransactionInput): TransactionWriteData {
  return {
    symbol: t.symbol?.trim().toUpperCase(),
    type: t.type,
    quantity: normalizeDecimalWrite(t.quantity, 'quantity'),
    price: normalizeDecimalWrite(t.price, 'price'),
    tradeDate: toInputDate(t.trade_date ?? t.tradeDate ?? new Date()),
    notes: t.notes ?? null,
    strategy: t.strategy ?? null,
    emotion: t.emotion ?? null,
  }
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
    const data = mapTransactionWriteData(t)

    if (t.id != null) {
      toUpdate.push({ id: BigInt(t.id), data })
    } else {
      toCreate.push(data)
    }
  }

  return { toCreate, toUpdate }
}

/**
 * Persist a transaction diff inside a Prisma $transaction callback.
 *
 * - Deletes transactions not in the `toUpdate` list
 * - Updates existing transactions (validates they belong to the diary)
 * - Creates new transactions
 */
async function persistTransactionDiff(
  tx: Prisma.TransactionClient,
  diaryId: bigint,
  userId: bigint,
  diff: TransactionDiffResult,
): Promise<void> {
  const updateIds = diff.toUpdate.map((t) => t.id)

  await tx.transaction.deleteMany({
    where: {
      diaryId,
      id: { notIn: updateIds.length > 0 ? updateIds : [BigInt(0)] },
    },
  })

  for (const { id, data } of diff.toUpdate) {
    const updated = await tx.transaction.updateMany({
      where: { id, diaryId },
      // Diary ownership was checked before this transaction. Re-write the
      // denormalized copy on every update so it cannot drift from diary.userId.
      data: { ...data, userId },
    })
    if (updated.count === 0) {
      throw Errors.validationError([
        { field: 'transactions', message: `Transaction ${id.toString()} not found in this diary` },
      ])
    }
  }

  for (const data of diff.toCreate) {
    await tx.transaction.create({
      data: { ...data, diaryId, userId },
    })
  }
}

export interface CreateDiaryForUserInput {
  userId: string | bigint
  body: DiaryInput & { appendToToday?: boolean }
  createdVia?: 'WEB' | 'API_KEY'
  createdByLabel?: string | null
}

function normalizeDiaryDate(value: string | Date | undefined): Date {
  try {
    return value === undefined ? toUtcNoonDate(new Date()) : toUtcNoonDate(value)
  } catch {
    throw Errors.validationError([{ field: 'date', message: 'date must be a valid calendar date' }])
  }
}

export async function createDiaryForUser(input: CreateDiaryForUserInput): Promise<Diary> {
  const userId = typeof input.userId === 'bigint' ? input.userId : BigInt(input.userId)
  const { body } = input
  const stockSymbols = normalizeDiaryStockSymbols(body.stockSymbols)

  // Validate before any read/write so malformed rows cannot reach persistence.
  validateDiaryInput(body.title, body.transactions, { baselineAvailable: false })

  if (!body.content) {
    throw Errors.validationError([{ field: 'content', message: 'Content is required' }])
  }

  const { title, content, date, transactions, alerts, appendToToday, tags, thesis, risk, execution, reviewDueAt } = body

  const diaryDate = normalizeDiaryDate(date)
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
    // Appending is still a real diary write: validate the incoming ledger
    // rows before touching the existing aggregate, and persist new child
    // rows in the same transaction as the content merge.
    if (transactions?.length) {
      await validateDiaryTransactionsForUser(userId, transactions)
    }

    const separator = '\n\n---\n\n'
    const mergedTags = tags?.length
      ? normalizeDiaryTags([...parseDiaryTags(existingDiary.tagsString), ...tags])
      : null

    const appendData = {
      content: `${existingDiary.content ?? ''}${separator}${content}`,
      ...(mergedTags ? { tagsString: stringifyDiaryTags(mergedTags) } : {}),
    }
    const hasChildWrites = Boolean(transactions?.length || alerts?.length || stockSymbols.length)

    try {
      if (!hasChildWrites) {
        const updatedDiary = await prisma.diary.update({
          where: { id: existingDiary.id },
          data: appendData,
          include: {
            transactions: true,
            alerts: true,
            stockContexts: { include: { stock: { select: { symbol: true } } } },
          },
        })
        return attachDiaryMetadata(updatedDiary) as unknown as Diary
      }

      const updatedDiary = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        for (const transaction of transactions ?? []) {
          await tx.transaction.create({
            data: {
              ...mapTransactionWriteData(transaction),
              userId,
              diaryId: existingDiary.id,
            },
          })
        }

        if (alerts?.length) {
          const timezone = await resolveUserTimezone(tx, userId)
          await persistAlerts(tx, existingDiary.id, alerts, timezone)
        }

        await unionDiaryStockContexts(tx, existingDiary.id, stockSymbols)

        return tx.diary.update({
          where: { id: existingDiary.id },
          data: appendData,
          include: {
            transactions: true,
            alerts: true,
            stockContexts: { include: { stock: { select: { symbol: true } } } },
          },
        })
      })

      return attachDiaryMetadata(updatedDiary) as unknown as Diary
    } catch (error) {
      if (isUniqueConstraintError(error)) {
        throw Errors.diaryAlreadyExists(diaryDateLabel(diaryDate))
      }
      throw error
    }
  }

  if (existingDiary) {
    const errorDate = date ? (typeof date === 'string' ? date : date.toISOString()) : diaryDate.toISOString()
    throw Errors.diaryAlreadyExists(errorDate)
  }

  // Server-side ledger validation is authoritative. The baseline includes
  // earlier Diaries owned by this user, then validates the current draft.
  if (transactions?.length) {
    await validateDiaryTransactionsForUser(userId, transactions)
  }

  const diaryCreateArgs = {
    data: {
      userId,
      title,
      content,
      tagsString: stringifyDiaryTags(tags),
      createdVia: input.createdVia ?? 'WEB',
      createdByLabel: input.createdByLabel ?? null,
      date: diaryDate,
      ...(thesis !== undefined ? { thesis } : {}),
      ...(risk !== undefined ? { risk } : {}),
      ...(execution !== undefined ? { execution } : {}),
      ...(reviewDueAt !== undefined ? { reviewDueAt: reviewDueAt ? new Date(reviewDueAt) : null } : {}),
      ...(reviewDueAt ? { reviewStatus: 'pending' } : {}),
      transactions: {
        create: transactions?.map((tx) => ({
          ...mapTransactionWriteData(tx),
          userId,
        })),
      },
    },
    include: {
      transactions: true,
      alerts: true,
      stockContexts: { include: { stock: { select: { symbol: true } } } },
    },
  }

  try {
    if (alerts || stockSymbols.length) {
      const diary = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        const createdDiary = await tx.diary.create(diaryCreateArgs)
        let persistedAlerts = createdDiary.alerts
        if (alerts) {
          const timezone = await resolveUserTimezone(tx, userId)
          persistedAlerts = await persistAlerts(tx, createdDiary.id, alerts, timezone)
        }
        await unionDiaryStockContexts(tx, createdDiary.id, stockSymbols)
        return {
          ...createdDiary,
          alerts: persistedAlerts,
          stockContexts: stockSymbols.map(symbol => ({ stock: { symbol } })),
        }
      })

      return attachDiaryMetadata(diary) as unknown as Diary
    }

    const diary = await prisma.diary.create(diaryCreateArgs)
    return attachDiaryMetadata(diary) as unknown as Diary
  } catch (error) {
    // The database constraint is the authority for concurrent creates. The
    // application preflight above is only a fast UX path.
    if (isUniqueConstraintError(error)) {
      throw Errors.diaryAlreadyExists(diaryDateLabel(diaryDate))
    }
    throw error
  }
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
  const stockSymbols = body.stockSymbols === undefined
    ? undefined
    : normalizeDiaryStockSymbols(body.stockSymbols)

  // --- Scalar validation ---

  validateDiaryInput(body.title, body.transactions, { baselineAvailable: false })

  // --- Ownership check ---
  // SQL-level ownership filter collapses not-found and not-owned into a
  // single notFound response, preventing resource existence leakage.

  const existingDiary = await prisma.diary.findFirst({
    where: { id: diaryId, userId },
  })

  if (!existingDiary) {
    throw Errors.diaryNotFound(String(diaryId))
  }

  const targetDiaryDate = body.date
    ? normalizeDiaryDate(body.date)
    : (existingDiary.date ?? new Date())

  if (body.date) {
    const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(targetDiaryDate)
    const occupiedDiary = await prisma.diary.findFirst({
      where: {
        userId,
        id: { not: diaryId },
        date: { gte: startOfDayUtc, lte: endOfDayUtc },
      },
      select: { id: true },
    })
    if (occupiedDiary) {
      throw Errors.diaryAlreadyExists(diaryDateLabel(targetDiaryDate))
    }
  }

  if (body.transactions !== undefined) {
    await validateDiaryTransactionsForUser(userId, body.transactions, diaryId)
  }

  // --- Diff transactions ---

  const diff = body.transactions === undefined
    ? null
    : diffTransactions(body.transactions)

  // --- Persist inside a Prisma transaction ---

  const { title, content, alerts, tags, thesis, risk, execution, reviewDueAt } = body

  try {
    const diary = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      if (diff) {
        await persistTransactionDiff(tx, diaryId, userId, diff)
      }
      if (alerts !== undefined) {
        const timezone = await resolveUserTimezone(tx, userId)
        await replaceAlerts(tx, diaryId, alerts, timezone)
      }
      if (stockSymbols !== undefined) {
        await replaceDiaryStockContexts(tx, diaryId, stockSymbols)
      }

      // Update the diary record
      return await tx.diary.update({
        where: { id: diaryId },
        data: {
          title,
          content,
          tagsString: tags !== undefined ? stringifyDiaryTags(tags) : undefined,
          date: body.date ? targetDiaryDate : undefined,
          ...(thesis !== undefined ? { thesis } : {}),
          ...(risk !== undefined ? { risk } : {}),
          ...(execution !== undefined ? { execution } : {}),
          ...(reviewDueAt !== undefined ? { reviewDueAt: reviewDueAt ? new Date(reviewDueAt) : null } : {}),
          ...(reviewDueAt !== undefined && existingDiary.reviewStatus !== 'reviewed'
            ? { reviewStatus: reviewDueAt ? 'pending' : 'none' }
            : {}),
        },
        include: {
          transactions: true,
          alerts: true,
          stockContexts: { include: { stock: { select: { symbol: true } } } },
        },
      })
    })

    return attachDiaryMetadata(diary) as unknown as Diary
  } catch (error) {
    if (isUniqueConstraintError(error)) {
      throw Errors.diaryAlreadyExists(diaryDateLabel(targetDiaryDate))
    }
    throw error
  }
}

// ---- Delete diary ----

/**
 * Delete a diary owned by `userId`.
 *
 * Uses a SQL-level ownership filter so that not-found and not-owned
 * collapse into a single diaryNotFound error — no resource existence
 * leakage via 404 vs 403 distinction. Mirrors the discipline/price-alert
 * query layer pattern.
 */
export async function deleteDiaryForUser(
  diaryId: string | bigint,
  userId: string | bigint,
): Promise<void> {
  const id = typeof diaryId === 'bigint' ? diaryId : BigInt(diaryId)
  const uid = typeof userId === 'bigint' ? userId : BigInt(userId)

  const existing = await prisma.diary.findFirst({ where: { id, userId: uid } })
  if (!existing) {
    throw Errors.diaryNotFound(String(id))
  }

  await validateDiaryTransactionsForUser(uid, [], id)
  await prisma.diary.delete({ where: { id } })
}
