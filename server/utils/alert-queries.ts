/**
 * Alert query layer — read / dismiss / create-from-standalone-handler paths.
 *
 * Validation via Zod schemas, ownership verification for dismiss / create.
 * Returns raw Prisma results; handlers call serialize().
 *
 * Write-side persistence (recurring series generation) is delegated to
 * alert-persistence.ts (deep module — do not reimplement here).
 *
 * Symmetric with discipline-queries.ts in structure.
 */

import type { Prisma } from '@prisma/client'
import { z } from 'zod'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { persistAlert } from '~/server/utils/alert-persistence'
import { findDiaryForUser } from '~/server/utils/diary-read'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

const RecurringModeEnum = z.enum(['WEEK', 'MONTH'])

/**
 * Create alert input.
 *
 * Public API (snake_case) is the canonical shape consumed by the HTTP body.
 * camelCase variants are accepted as a robustness fallback consistent with
 * alert-persistence.ts which reads both.
 *
 * `diary_id` is kept as string | number — never coerced via Number() because
 * diary IDs are BigInt PKs that can exceed Number.MAX_SAFE_INTEGER. The query
 * function performs BigInt(...) after schema validation.
 */
export const CreateAlertSchema = z
  .object({
    diary_id: z.union([z.string(), z.number()]),
    message: z
      .string()
      .trim()
      .min(1, { message: 'Message is required' })
      .max(500, { message: 'Message must be at most 500 characters' }),
    trigger_at: z.union([z.string(), z.date()]).optional(),
    triggerAt: z.union([z.string(), z.date()]).optional(),
    recurring_mode: RecurringModeEnum.optional(),
    recurringMode: RecurringModeEnum.optional(),
  })
  // Strip camelCase duplicates before handing off to persistAlert so the
  // persistence layer receives a single canonical shape.
  .transform((data) => ({
    diary_id: data.diary_id,
    message: data.message,
    trigger_at: data.trigger_at ?? data.triggerAt,
    recurring_mode: data.recurring_mode ?? data.recurringMode,
  }))

export type CreateAlertInput = z.infer<typeof CreateAlertSchema>

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * List active (non-dismissed) alerts for a user, with diary relation
 * (id, title). Mirrors the original inline query shape so existing API
 * tests that mock prisma.alert.findMany keep passing.
 */
export async function listActiveAlerts(userId: bigint) {
  return prisma.alert.findMany({
    where: { diary: { userId }, isDismissed: false },
    include: { diary: { select: { id: true, title: true } } },
    orderBy: { triggerAt: 'asc' },
  })
}

/**
 * Dismiss an alert. Verifies ownership via the diary relation
 * (SQL-level — symmetric with the discipline-queries.ts pattern).
 * Throws alertNotFound if the alert doesn't exist or isn't owned by the user.
 */
export async function dismissAlert(alertId: bigint | string, userId: bigint) {
  const id = typeof alertId === 'string' ? BigInt(alertId) : alertId

  const existing = await prisma.alert.findFirst({
    where: { id, diary: { userId } },
  })

  if (!existing) {
    throw Errors.alertNotFound(String(id)).toH3Error()
  }

  return prisma.alert.update({
    where: { id },
    data: { isDismissed: true },
  })
}

/**
 * Create a single or recurring alert for a diary.
 *
 * - Validates input via Zod (CreateAlertSchema).
 * - Verifies diary ownership via findDiaryForUser (throws diaryNotFound /
 *   diaryAccessDenied on failure — surfaced through handleApiError).
 * - Delegates recurring / single persistence to persistAlert inside a
 *   transaction.
 *
 * Returns the persisted parent alert, or null for an empty recurring set.
 */
export async function createAlertForDiary(
  userId: bigint,
  input: unknown,
) {
  const validated = CreateAlertSchema.parse(input)
  const diaryId = BigInt(validated.diary_id)

  // Throws diaryNotFound / diaryAccessDenied if not owned.
  await findDiaryForUser(diaryId, userId)

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { timezone: true },
    })
    const timezone = user?.timezone ?? 'Asia/Taipei'

    return persistAlert(tx, diaryId, {
      message: validated.message,
      trigger_at: validated.trigger_at,
      recurring_mode: validated.recurring_mode,
    }, timezone)
  })
}
