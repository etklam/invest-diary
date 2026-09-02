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
import {
  ALERT_MAX_ITEMS,
  alertCreateRequestSchema,
  alertRecurringModeSchema,
  toAlertResponse,
  type AlertCreateRequest,
} from '~/lib/contracts/alerts'
import { persistAlert } from '~/server/utils/alert-persistence'
import { findDiaryForUser } from '~/server/utils/diary-read'
import { getUserTimezone } from '~/server/utils/user-queries'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

/**
 * Backwards-compatible parser for the legacy standalone alert body. The
 * canonical wire contract is alertCreateRequestSchema (camelCase); this
 * adapter is kept only for existing snake_case Web callers during the v1
 * release window.
 *
 * The public HTTP API is camelCase; this adapter retains snake_case support for
 * existing internal/legacy callers only.
 * camelCase variants are accepted as a robustness fallback consistent with
 * alert-persistence.ts which reads both.
 *
 * `diary_id` is kept as string | number — never coerced via Number() because
 * diary IDs are BigInt PKs that can exceed Number.MAX_SAFE_INTEGER. The query
 * function performs BigInt(...) after schema validation.
 */
const legacyTriggerAtSchema = z.union([z.string(), z.date()]).refine(
  value => !Number.isNaN(new Date(value).getTime()),
  { message: 'trigger_at must be a valid date' },
)
export const CreateAlertSchema = z.preprocess(value => {
  if (!value || typeof value !== 'object') return value
  const body = value as Record<string, unknown>
  return {
    diary_id: body.diary_id ?? body.diaryId,
    message: body.message,
    trigger_at: body.trigger_at ?? body.triggerAt,
    recurring_mode: body.recurring_mode ?? body.recurringMode,
  }
}, z.object({
  diary_id: z.union([z.string(), z.number()]),
  message: z.string().trim().min(1, { message: 'Message is required' }).max(500),
  trigger_at: legacyTriggerAtSchema.optional(),
  triggerAt: legacyTriggerAtSchema.optional(),
  recurring_mode: alertRecurringModeSchema.optional(),
  recurringMode: alertRecurringModeSchema.optional(),
})).transform(data => ({
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
  const rows = await prisma.alert.findMany({
    where: { diary: { userId }, isDismissed: false },
    include: { diary: { select: { id: true, title: true } } },
    orderBy: [{ triggerAt: 'asc' }, { id: 'asc' }],
    take: ALERT_MAX_ITEMS,
  })
  return rows.map(toAlertResponse)
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
    include: { diary: { select: { id: true, title: true } } },
  })
}

/**
 * Create a single or recurring alert for a diary.
 *
 * - Validates input via Zod (CreateAlertSchema).
 * - Verifies diary ownership via findDiaryForUser (throws diaryNotFound /
 *   diaryNotFound on failure — surfaced through handleApiError).
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
  const request: AlertCreateRequest = alertCreateRequestSchema.parse({
    diaryId: String(diaryId),
    message: validated.message,
    triggerAt: validated.trigger_at instanceof Date
      ? validated.trigger_at.toISOString()
      : validated.trigger_at ?? new Date().toISOString(),
    ...(validated.recurring_mode ? { recurringMode: validated.recurring_mode } : {}),
  })

  // Throws diaryNotFound if not owned.
  await findDiaryForUser(diaryId, userId)

  const timezone = await getUserTimezone(userId)
  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    return persistAlert(tx, diaryId, {
      message: request.message,
      triggerAt: request.triggerAt,
      ...(request.recurringMode ? { recurringMode: request.recurringMode } : {}),
    }, timezone)
  })
}
