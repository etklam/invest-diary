import { describe, it, expect } from 'vitest'
import {
  createQuickReminderOptions,
  getQuickReminderLabel,
  resolveQuickReminderTime,
} from '~/lib/quicknote/quick-reminders'

const t = (key: string) => ({
  'quickDiary.reminders.presets.tomorrow': '明天',
  'quickDiary.reminders.presets.nextWeek': '下周',
  'quickDiary.reminders.presets.nextMonth': '下個月',
}[key] || key)

describe('quick-reminders', () => {
  it('exposes the semantic quick reminder presets in UI order', () => {
    expect(createQuickReminderOptions(t)).toEqual([
      { preset: 'tomorrow', label: '明天' },
      { preset: 'nextWeek', label: '下周' },
      { preset: 'nextMonth', label: '下個月' },
    ])
  })

  it('resolves labels by preset', () => {
    expect(getQuickReminderLabel('tomorrow', t)).toBe('明天')
    expect(getQuickReminderLabel('nextWeek', t)).toBe('下周')
    expect(getQuickReminderLabel('nextMonth', t)).toBe('下個月')
  })

  it('resolves quick reminder times relative to now', () => {
    const now = new Date('2026-03-22T08:30:00.000Z')

    expect(resolveQuickReminderTime('tomorrow', now)).toBe('2026-03-23T08:30:00.000Z')
    expect(resolveQuickReminderTime('nextWeek', now)).toBe('2026-03-29T08:30:00.000Z')
    expect(resolveQuickReminderTime('nextMonth', now)).toBe('2026-04-22T08:30:00.000Z')
  })
})
