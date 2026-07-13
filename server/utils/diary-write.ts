import type { Prisma } from '@prisma/client'
import prisma from '~/lib/prisma'
import type { DiaryInput, Diary, TransactionInput } from '~/types/diary'
import { getUtcDayRange, toUtcNoonDate } from '~/lib/dates/normalize'
import { normalizeDiaryTags, parseDiaryTags, stringifyDiaryTags } from '~/lib/diary-tags'
import { Errors } from '~/lib/errors/factory'
import { attachDiaryTags } from '~/server/utils/diary-response'
import { persistAlerts, replaceAlerts } from '~/server/utils/alert-persistence'
import {
  calculateLedgerHoldings,
  validateTransactionLedger,
  type HoldingsInput,
} from '~/lib/diary-authoring/validation'

/**
 * Normalize a string-or-Date input into a native Date.
 * The PUT handler previously duplicated this — now it lives here only.
 */
export function toInputDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

// ---- Shared validation ----

export interface DiaryValidationOptions {
  /** Baseline holdings at the target diary date. */
  initialHoldings?: HoldingsInput
  /** False means the caller deliberately has no reliable ledger context. */
  baselineAvailable?: boolean
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

/**
 * Read the cross-Diary ledger baseline. Ownership is deliberately expressed
 * through `diary.userId`; Transaction.userId is only a denormalized copy.
 *
 * Option A uses the target Diary date as the ledger cutoff. The current
 * Diary's old rows are excluded on update so a draft is not counted twice.
 */
export async function readDiaryLedgerBaseline(
  userId: bigint,
  targetDiaryDate: Date,
  excludeDiaryId?: bigint,
): Promise<DiaryLedgerBaselineTransaction[]> {
  const { endOfDayUtc } = getUtcDayRange(targetDiaryDate)

  return await prisma.transaction.findMany({
    where: {
      diary: {
        userId,
        date: { lte: targetDiaryDate },
      },
      tradeDate: { lte: endOfDayUtc },
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
  targetDiaryDate: Date,
  transactions: TransactionInput[] | undefined,
  excludeDiaryId?: bigint,
): Promise<void> {
  if (!transactions?.length) return

  const baselineRows = await readDiaryLedgerBaseline(userId, targetDiaryDate, excludeDiaryId)
  let baselineHoldings: Map<string, number>

  try {
    baselineHoldings = calculateLedgerHoldings({}, baselineRows)
  } catch (error) {
    const message = error instanceof Error ? error.message : '既有交易帳本無效'
    throw Errors.validationError([{ field: 'transactions', message }])
  }

  validateDiaryInput('valid', transactions, {
    initialHoldings: baselineHoldings,
    baselineAvailable: true,
  })
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
  if (typeof value !== 'string') return value

  const numberValue = Number(value)
  if (!Number.isFinite(numberValue)) {
    throw Errors.validationError([{ field: `transactions.${field}`, message: `${field} must be a finite number` }])
  }

  return numberValue
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
  createdVia?: 'WEB' | 'API_KEY' | 'TELEGRAM_BOT'
  createdByLabel?: string | null
}

export async function createDiaryForUser(input: CreateDiaryForUserInput): Promise<Diary> {
  const userId = typeof input.userId === 'bigint' ? input.userId : BigInt(input.userId)
  const { body } = input

  // Validate in original order: title → content → transactions
  if (!body.title) {
    throw Errors.validationError([{ field: 'title', message: 'Title is required' }])
  }

  if (!body.content) {
    throw Errors.validationError([{ field: 'content', message: 'Content is required' }])
  }

  const { title, content, date, transactions, alerts, appendToToday, tags, thesis, risk, execution, reviewDueAt } = body

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

  // Server-side ledger validation is authoritative. The baseline includes
  // earlier Diaries owned by this user, then validates the current draft.
  await validateDiaryTransactionsForUser(userId, diaryDate, transactions)

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
    },
  }

  if (alerts) {
    const diary = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const createdDiary = await tx.diary.create(diaryCreateArgs)
      const persistedAlerts = await persistAlerts(tx, createdDiary.id, alerts)
      return { ...createdDiary, alerts: persistedAlerts }
    })

    return attachDiaryTags(diary as Diary)
  }

  const diary = await prisma.diary.create(diaryCreateArgs)

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

  // --- Scalar validation ---

  validateDiaryInput(body.title, undefined, { baselineAvailable: false })

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
    ? toUtcNoonDate(body.date)
    : (existingDiary.date ?? new Date())
  await validateDiaryTransactionsForUser(userId, targetDiaryDate, body.transactions, diaryId)

  // --- Diff transactions ---

  const diff = diffTransactions(body.transactions)

  // --- Persist inside a Prisma transaction ---

  const { title, content, date, alerts, tags, thesis, risk, execution, reviewDueAt, reviewStatus, reviewedAt } = body

  const diary = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    await persistTransactionDiff(tx, diaryId, userId, diff)
    await replaceAlerts(tx, diaryId, alerts)

    // Update the diary record
    return await tx.diary.update({
      where: { id: diaryId },
      data: {
        title,
        content,
        tagsString: tags !== undefined ? stringifyDiaryTags(tags) : undefined,
        date: date ? toUtcNoonDate(date) : undefined,
        ...(thesis !== undefined ? { thesis } : {}),
        ...(risk !== undefined ? { risk } : {}),
        ...(execution !== undefined ? { execution } : {}),
        ...(reviewDueAt !== undefined ? { reviewDueAt: reviewDueAt ? new Date(reviewDueAt) : null } : {}),
        ...(reviewStatus !== undefined ? { reviewStatus } : {}),
        ...(reviewedAt !== undefined ? { reviewedAt: reviewedAt ? new Date(reviewedAt) : null } : {}),
      },
      include: {
        transactions: true,
        alerts: true,
      },
    })
  })

  return attachDiaryTags(diary as Diary)
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
  await prisma.diary.delete({ where: { id } })
}
