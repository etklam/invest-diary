import type { QuickNoteQuickReminderPreset } from '~/types/quicknote'

type Translate = (key: string) => string

export function createQuickReminderOptions(t: Translate): Array<{
  preset: QuickNoteQuickReminderPreset
  label: string
}> {
  return [
    { preset: 'tomorrow', label: t('quickDiary.reminders.presets.tomorrow') },
    { preset: 'nextWeek', label: t('quickDiary.reminders.presets.nextWeek') },
    { preset: 'nextMonth', label: t('quickDiary.reminders.presets.nextMonth') },
  ]
}

export function getQuickReminderLabel(preset: QuickNoteQuickReminderPreset, t: Translate): string {
  return createQuickReminderOptions(t).find(option => option.preset === preset)?.label || ''
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
