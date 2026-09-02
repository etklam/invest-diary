import { describe, expect, it } from 'vitest'
import {
  resolveCountryCodeFromTimezone,
  calculateMonthCoverage,
  buildDailyActivityMap,
  toDateKeyInTimezone
} from '~/lib/holiday-heatmap'
import type { DiaryResponse } from '~/lib/contracts/diary'

describe('holiday-heatmap utilities', () => {
  it('maps known timezone to country code for Nager.Date', () => {
    expect(resolveCountryCodeFromTimezone('Asia/Taipei')).toBe('TW')
    expect(resolveCountryCodeFromTimezone('America/New_York')).toBe('US')
    expect(resolveCountryCodeFromTimezone('Europe/London')).toBe('GB')
    expect(resolveCountryCodeFromTimezone('UTC')).toBeNull()
  })

  it('calculates month coverage excluding holidays', () => {
    const activeDays = new Set(['2026-03-01', '2026-03-03'])
    const excludedDays = new Set(['2026-03-02', '2026-03-04'])

    const result = calculateMonthCoverage({
      year: 2026,
      month: 2,
      activeDays,
      excludedDays
    })

    expect(result.activeCount).toBe(2)
    expect(result.eligibleDays).toBe(29)
    expect(result.coverage).toBe('7%')
  })

  it('builds day activity map in user timezone', () => {
    const diaries: DiaryResponse[] = [
      {
        id: '1',
        userId: '1',
        title: 'A',
        content: null,
        date: '2026-03-02',
        createdAt: '2026-03-01T16:30:00.000Z',
        updatedAt: '2026-03-01T16:30:00.000Z',
        tags: [],
        stockSymbols: [],
      }
    ]

    const activity = buildDailyActivityMap(diaries, 'Asia/Taipei')
    expect(activity.has('2026-03-02')).toBe(true)
  })

  it('formats date keys by timezone', () => {
    expect(toDateKeyInTimezone(new Date('2026-03-01T23:00:00.000Z'), 'Asia/Taipei')).toBe('2026-03-02')
    expect(toDateKeyInTimezone(new Date('2026-03-01T23:00:00.000Z'), 'America/New_York')).toBe('2026-03-01')
  })
})
