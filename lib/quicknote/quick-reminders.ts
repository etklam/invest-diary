import type { QuickNoteQuickReminderPreset } from '~/types/quicknote'

export const quickReminderOptions: Array<{
  preset: QuickNoteQuickReminderPreset
  label: string
}> = [
  { preset: 'tomorrow', label: '明天' },
  { preset: 'nextWeek', label: '下周' },
  { preset: 'nextMonth', label: '下個月' },
]

export function getQuickReminderLabel(preset: QuickNoteQuickReminderPreset): string {
  return quickReminderOptions.find(option => option.preset === preset)?.label || ''
}

export function resolveQuickReminderTime(
  preset: QuickNoteQuickReminderPreset,
  now: Date = new Date()
): string {
  const target = new Date(now)

  switch (preset) {
    case 'tomorrow':
      target.setDate(target.getDate() + 1)
      break
    case 'nextWeek':
      target.setDate(target.getDate() + 7)
      break
    case 'nextMonth':
      target.setMonth(target.getMonth() + 1)
      break
  }

  return target.toISOString()
}
