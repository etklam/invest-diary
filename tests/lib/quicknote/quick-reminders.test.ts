import { describe, it, expect } from 'vitest'
import {
  getQuickReminderLabel,
  quickReminderOptions,
  resolveQuickReminderTime,
} from '~/lib/quicknote/quick-reminders'

describe('quick-reminders', () => {
  it('exposes the semantic quick reminder presets in UI order', () => {
    expect(quickReminderOptions).toEqual([
      { preset: 'tomorrow', label: '明天' },
      { preset: 'nextWeek', label: '下周' },
      { preset: 'nextMonth', label: '下個月' },
    ])
  })

  it('resolves labels by preset', () => {
    expect(getQuickReminderLabel('tomorrow')).toBe('明天')
    expect(getQuickReminderLabel('nextWeek')).toBe('下周')
    expect(getQuickReminderLabel('nextMonth')).toBe('下個月')
  })

  it('resolves quick reminder times relative to now', () => {
    const now = new Date('2026-03-22T08:30:00.000Z')

    expect(resolveQuickReminderTime('tomorrow', now)).toBe('2026-03-23T08:30:00.000Z')
    expect(resolveQuickReminderTime('nextWeek', now)).toBe('2026-03-29T08:30:00.000Z')
    expect(resolveQuickReminderTime('nextMonth', now)).toBe('2026-04-22T08:30:00.000Z')
  })
})
