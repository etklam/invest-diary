import type { Prisma } from '@prisma/client'
import { generateRecurringAlertsData } from '~/lib/recurring-alerts'
import type { AlertInput } from '~/types/diary'

export async function persistAlert(
  tx: Prisma.TransactionClient,
  diaryId: bigint,
  input: AlertInput,
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
    triggerTime: triggerAt.toTimeString().slice(0, 5),
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
): Promise<void> {
  await tx.alert.deleteMany({ where: { diaryId } })
  await persistAlerts(tx, diaryId, alerts)
}

export async function persistAlerts(
  tx: Prisma.TransactionClient,
  diaryId: bigint,
  alerts: AlertInput[] | undefined,
) {
  const persisted = []

  for (const alert of alerts ?? []) {
    const result = await persistAlert(tx, diaryId, alert)
    if (result) persisted.push(result)
  }

  return persisted
}
