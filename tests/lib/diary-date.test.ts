import { describe, it, expect } from 'vitest'
import {
  formatYmdInTimezone,
  getUtcDayRange,
  toDateTimeLocalValue,
  toUtcNoonDate
} from '~/lib/diary-date'

describe('lib/diary-date', () => {
  it('should normalize YYYY-MM-DD to UTC noon', () => {
    const normalized = toUtcNoonDate('2026-03-15')
    expect(normalized.toISOString()).toBe('2026-03-15T12:00:00.000Z')
  })

  it('should normalize ISO date-time to the same UTC day noon', () => {
    const normalized = toUtcNoonDate('2026-03-15T01:23:45.000Z')
    expect(normalized.toISOString()).toBe('2026-03-15T12:00:00.000Z')
  })

  it('should return UTC day range from normalized date', () => {
    const normalized = toUtcNoonDate('2026-03-15')
    const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(normalized)

    expect(startOfDayUtc.toISOString()).toBe('2026-03-15T00:00:00.000Z')
    expect(endOfDayUtc.toISOString()).toBe('2026-03-15T23:59:59.999Z')
  })

  it('should format YYYY-MM-DD in a specific timezone', () => {
    expect(formatYmdInTimezone('2026-03-15T23:30:00.000Z', 'Asia/Taipei')).toBe('2026-03-16')
    expect(formatYmdInTimezone('2026-03-15T01:30:00.000Z', 'America/Los_Angeles')).toBe('2026-03-14')
  })

  it('should convert ISO instant to datetime-local value with stable round-trip', () => {
    const iso = '2026-03-15T12:34:00.000Z'
    const localValue = toDateTimeLocalValue(iso)
    const roundTrip = new Date(localValue).toISOString()

    expect(localValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(roundTrip).toBe(iso)
  })
})
