import { describe, expect, it } from 'vitest'

import {
  getUserDayRange,
  getUserTodayYmd,
  getUserYmdInTimezone,
  resolveUserTimezone,
  resolveCountryCodeFromTimezone,
} from '~/lib/dates/user-tz'

describe('lib/dates/user-tz', () => {
  describe('resolveUserTimezone', () => {
    it('prefers the persisted user timezone', () => {
      expect(resolveUserTimezone({ timezone: 'America/New_York' }, 'UTC')).toBe('America/New_York')
    })

    it('falls back to the browser timezone when the user has none', () => {
      expect(resolveUserTimezone({ timezone: null }, 'Europe/London')).toBe('Europe/London')
    })

    it('falls back to Asia/Taipei when neither source is available', () => {
      expect(resolveUserTimezone(undefined, undefined)).toBe('Asia/Taipei')
    })
  })

  // ─── getUserDayRange ────────────────────────────────────────────────────

  describe('getUserDayRange', () => {
    it('returns [start, end) half-open interval for Asia/Taipei (UTC+8)', () => {
      // User-local 2026-06-15 in Taipei = UTC 2026-06-14T16:00 ~ 2026-06-15T16:00
      const anchor = new Date('2026-06-15T02:00:00Z') // 10:00 Taipei
      const { start, end } = getUserDayRange(anchor, 'Asia/Taipei')

      expect(start.toISOString()).toBe('2026-06-14T16:00:00.000Z')
      // Half-open: end is exclusive (start of next day)
      expect(end.toISOString()).toBe('2026-06-15T16:00:00.000Z')
    })

    it('handles America/Los_Angeles (UTC-7 DST in June)', () => {
      // June 2026: LA is UTC-7
      // User-local 2026-06-15 in LA = UTC 2026-06-15T07:00 ~ 2026-06-16T07:00
      const anchor = new Date('2026-06-15T18:00:00Z') // 11:00 LA
      const { start, end } = getUserDayRange(anchor, 'America/Los_Angeles')

      expect(start.toISOString()).toBe('2026-06-15T07:00:00.000Z')
      expect(end.toISOString()).toBe('2026-06-16T07:00:00.000Z')
    })

    it('handles America/Los_Angeles in winter (UTC-8, no DST)', () => {
      // December 2025: LA is UTC-8
      const anchor = new Date('2025-12-15T18:00:00Z') // 10:00 LA
      const { start, end } = getUserDayRange(anchor, 'America/Los_Angeles')

      expect(start.toISOString()).toBe('2025-12-15T08:00:00.000Z')
      expect(end.toISOString()).toBe('2025-12-16T08:00:00.000Z')
    })

    it('handles year boundary (Taipei 2026-01-01)', () => {
      const anchor = new Date('2026-01-01T02:00:00Z') // 10:00 Taipei
      const { start, end } = getUserDayRange(anchor, 'Asia/Taipei')

      expect(start.toISOString()).toBe('2025-12-31T16:00:00.000Z')
      expect(end.toISOString()).toBe('2026-01-01T16:00:00.000Z')
    })

    it('handles month boundary (Taipei 2026-03-01)', () => {
      const anchor = new Date('2026-03-01T02:00:00Z')
      const { start, end } = getUserDayRange(anchor, 'Asia/Taipei')

      expect(start.toISOString()).toBe('2026-02-28T16:00:00.000Z')
      expect(end.toISOString()).toBe('2026-03-01T16:00:00.000Z')
    })

    it('handles UTC timezone (no offset)', () => {
      const anchor = new Date('2026-06-15T12:00:00Z')
      const { start, end } = getUserDayRange(anchor, 'UTC')

      expect(start.toISOString()).toBe('2026-06-15T00:00:00.000Z')
      expect(end.toISOString()).toBe('2026-06-16T00:00:00.000Z')
    })

    it('accepts a YMD string anchor', () => {
      const { start, end } = getUserDayRange('2026-06-15', 'Asia/Taipei')

      // '2026-06-15' parsed as UTC midnight → 2026-06-15T00:00:00Z = 08:00 Taipei → same day
      expect(start.toISOString()).toBe('2026-06-14T16:00:00.000Z')
      expect(end.toISOString()).toBe('2026-06-15T16:00:00.000Z')
    })
  })

  // ─── getUserTodayYmd ────────────────────────────────────────────────────

  describe('getUserTodayYmd', () => {
    it('returns today YMD in Asia/Taipei for a known UTC instant', () => {
      // 2026-06-15T18:00:00Z = 2026-06-16T02:00 in Taipei
      expect(getUserTodayYmd('Asia/Taipei', new Date('2026-06-15T18:00:00Z'))).toBe('2026-06-16')
    })

    it('returns same UTC day when timezone is UTC', () => {
      expect(getUserTodayYmd('UTC', new Date('2026-06-15T18:00:00Z'))).toBe('2026-06-15')
    })

    it('returns previous day for negative-offset timezone in early UTC', () => {
      // 2026-06-15T02:00:00Z = 2026-06-14T19:00 in LA (UTC-7)
      expect(getUserTodayYmd('America/Los_Angeles', new Date('2026-06-15T02:00:00Z'))).toBe('2026-06-14')
    })
  })

  // ─── getUserYmdInTimezone ───────────────────────────────────────────────

  describe('getUserYmdInTimezone', () => {
    it('aligns with formatYmdInTimezone behaviour', () => {
      // 2026-03-15T23:30:00Z = 2026-03-16T07:30 in Taipei
      expect(getUserYmdInTimezone('2026-03-15T23:30:00.000Z', 'Asia/Taipei')).toBe('2026-03-16')
    })

    it('returns same YMD for UTC', () => {
      expect(getUserYmdInTimezone('2026-06-15T12:00:00Z', 'UTC')).toBe('2026-06-15')
    })

    it('accepts Date object input', () => {
      expect(getUserYmdInTimezone(new Date('2026-06-15T18:00:00Z'), 'Asia/Taipei')).toBe('2026-06-16')
    })

    it('throws on invalid date string', () => {
      expect(() => getUserYmdInTimezone('not-a-date', 'Asia/Taipei')).toThrow()
    })
  })

  // ─── resolveCountryCodeFromTimezone ─────────────────────────────────────

  describe('resolveCountryCodeFromTimezone', () => {
    it('resolves Asia/Taipei to TW', () => {
      expect(resolveCountryCodeFromTimezone('Asia/Taipei')).toBe('TW')
    })

    it('resolves America/Los_Angeles to US', () => {
      expect(resolveCountryCodeFromTimezone('America/Los_Angeles')).toBe('US')
    })

    it('resolves America/New_York to US', () => {
      expect(resolveCountryCodeFromTimezone('America/New_York')).toBe('US')
    })

    it('resolves Europe/London to GB', () => {
      expect(resolveCountryCodeFromTimezone('Europe/London')).toBe('GB')
    })

    it('returns null for unmapped timezone', () => {
      expect(resolveCountryCodeFromTimezone('Antarctica/Casey')).toBeNull()
    })

    it('returns null for garbage string', () => {
      expect(resolveCountryCodeFromTimezone('garbage')).toBeNull()
    })
  })
})
