import type { SerializedId } from './common'
import type { AlertResponse, AlertRecurringMode } from '~/lib/contracts/alerts'

export interface AlertDiaryReference {
  id: SerializedId
  title: string
}

/** Canonical alert shape used after crossing an HTTP or WebSocket boundary. */
export interface AlertItem {
  id: SerializedId
  message: string
  triggerAt: string
  isDismissed: boolean
  recurringMode?: AlertRecurringMode | null
  instanceNumber?: number | null
  createdAt?: string
  diary?: AlertDiaryReference
}

/** HTTP alerts include the persisted creation timestamp. */
export type AlertApiResponse = AlertResponse

/** WebSocket notifications contain the subset needed to display an alert. */
export type AlertPayload = Pick<AlertItem, 'id' | 'message' | 'triggerAt' | 'diary'>

interface AlertResponseLike {
  id: SerializedId
  message: string
  triggerAt?: string | Date
  trigger_at?: string | Date
  isDismissed?: boolean
  is_dismissed?: boolean
  recurringMode?: string | null
  recurring_mode?: string | null
  instanceNumber?: number | null
  instance_number?: number | null
  createdAt?: string | Date
  created_at?: string | Date
  diary?: AlertDiaryReference | null
}

const toIsoString = (value: string | Date | undefined): string | undefined => {
  if (value === undefined) return undefined
  return value instanceof Date ? value.toISOString() : value
}

/**
 * Normalize boundary data once. The snake_case fields are kept only as a
 * compatibility input for older callers; all internal consumers use camelCase.
 */
export function normalizeAlert(alert: AlertResponseLike): AlertItem {
  const triggerAt = toIsoString(alert.triggerAt ?? alert.trigger_at)

  if (!triggerAt) {
    throw new Error(`Alert ${alert.id} is missing triggerAt`)
  }

  return {
    id: String(alert.id),
    message: alert.message,
    triggerAt,
    isDismissed: alert.isDismissed ?? alert.is_dismissed ?? false,
    recurringMode: [alert.recurringMode ?? alert.recurring_mode].find(
      value => value === 'WEEK' || value === 'MONTH',
    ) as AlertItem['recurringMode'] ?? null,
    instanceNumber: alert.instanceNumber ?? alert.instance_number,
    createdAt: toIsoString(alert.createdAt ?? alert.created_at),
    diary: alert.diary
      ? {
          id: String(alert.diary.id),
          title: alert.diary.title,
        }
      : undefined,
  }
}
