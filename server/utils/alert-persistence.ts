import type { Prisma } from '@prisma/client'
import { generateRecurringAlertsData } from '~/lib/recurring-alerts'
import { DIARY_PAYLOAD_LIMITS } from '~/lib/contracts/diary/validation'
import { Errors } from '~/lib/errors/factory'
import type { AlertInput } from '~/lib/contracts/diary'

export async function persistAlert(
  tx: Prisma.TransactionClient,
  diaryId: bigint,
  input: AlertInput,
  timezone: string,
) {
  const triggerAt = new Date(input.trigger_at ?? input.triggerAt ?? new Date())
  const recurringMode = input.recurring_mode ?? input.recurringMode

  if (!recurringMode) {
    return await tx.alert.create({
      data: {
        diaryId,
        message: input.message,
        triggerAt,
      },
    })
  }

  const [parentData, ...childrenData] = generateRecurringAlertsData({
    diaryId,
    message: input.message,
    mode: recurringMode,
    startDate: triggerAt,
    timezone,
  })

  if (!parentData) {
    return null
  }

  const parent = await tx.alert.create({
    data: {
      ...parentData,
      parentId: undefined,
    },
  })

  await tx.alert.update({
    where: { id: parent.id },
    data: { parentId: parent.id },
  })

  if (childrenData.length > 0) {
    await tx.alert.createMany({
      data: childrenData.map((child) => ({
        ...child,
        parentId: parent.id,
      })),
    })
  }

  return parent
}

export async function replaceAlerts(
  tx: Prisma.TransactionClient,
  diaryId: bigint,
  alerts: AlertInput[] | undefined,
  timezone: string,
): Promise<void> {
  await tx.alert.deleteMany({ where: { diaryId } })
  await persistAlerts(tx, diaryId, alerts, timezone)
}

export async function persistAlerts(
  tx: Prisma.TransactionClient,
  diaryId: bigint,
  alerts: AlertInput[] | undefined,
  timezone: string,
) {
  // Defensive cap — the diary create/update path already enforces this via
  // validateDiaryPayloadLimits; this keeps the persistence layer safe for any
  // future caller.
  if ((alerts?.length ?? 0) > DIARY_PAYLOAD_LIMITS.alerts) {
    throw Errors.validationError([{
      field: 'alerts',
      message: `A diary allows at most ${DIARY_PAYLOAD_LIMITS.alerts} alerts`,
    }])
  }

  const persisted = []

  for (const alert of alerts ?? []) {
    const result = await persistAlert(tx, diaryId, alert, timezone)
    if (result) persisted.push(result)
  }

  return persisted
}
