import { describe, it, expect } from 'vitest'
import {
  formatDate,
  formatShortDate,
  formatDateWithWeekday,
  formatYmdInTimezone,
  formatYearMonth,
} from '~/lib/dates/format'

// ─── formatDate (canonical) ────────────────────────────────────────────────────

describe('formatDate', () => {
  it('應以預設時區 Asia/Taipei 和 locale zh-TW 格式化日期', () => {
    const result = formatDate(new Date('2024-01-15T10:30:00Z'))
    // Asia/Taipei 是 UTC+8，所以 10:30 UTC = 18:30 Taipei
    // zh-TW locale 使用 12 小時制 + 下午/上午 標記
    expect(result).toMatch('2024/01/15')
    expect(result).toMatch('06:30')
    expect(result).toMatch('下午')
  })

  it('應包含日期與時間', () => {
    const result = formatDate(new Date('2024-01-15T14:30:00+08:00'))
    expect(result).toMatch(/\d{2}:\d{2}/)
  })

  it('應處理午夜時間', () => {
    const result = formatDate(new Date('2024-01-15T00:00:00+08:00'))
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })

  it('應正確格式化不同月份和日期', () => {
    const date1 = new Date('2024-12-31T23:59:59+08:00')
    const result1 = formatDate(date1)
    expect(result1).toContain('2024')

    const date2 = new Date('2024-01-01T00:00:01+08:00')
    const result2 = formatDate(date2)
    expect(result2).toContain('2024')
  })

  it('應接受字串輸入', () => {
    const result = formatDate('2024-06-15T12:00:00+08:00')
    expect(result).toMatch(/2024\/06\/15/)
  })

  it('應支援自訂 locale', () => {
    const result = formatDate(new Date('2024-01-15T12:00:00+08:00'), { locale: 'en-US' })
    // en-US 使用 MM/DD/YYYY 格式
    expect(result).toMatch(/01\/15\/2024/)
  })

  it('應支援自訂時區', () => {
    const date = new Date('2024-01-15T12:00:00Z')
    // UTC 12:00 = Tokyo 21:00 (zh-TW locale 用 12 小時制顯示 "下午09:00")
    const result = formatDate(date, { timezone: 'Asia/Tokyo' })
    expect(result).toContain('09:00')
  })
})

// ─── formatShortDate ───────────────────────────────────────────────────────────

describe('formatShortDate', () => {
  it('應以 zh-TW 格式輸出簡短日期', () => {
    const result = formatShortDate(new Date('2024-01-15T12:00:00+08:00'))
    expect(result).toBe('2024/01/15')
  })

  it('應以預設時區 Asia/Taipei 運作', () => {
    const result = formatShortDate('2024-06-01T00:00:00+08:00')
    expect(result).toBe('2024/06/01')
  })

  it('應支援自訂時區', () => {
    const date = new Date('2024-01-15T20:00:00-05:00') // Jan 15 in New York
    // In Tokyo, 20:00 EST = 10:00 JST next day (Jan 16)
    const result = formatShortDate(date, 'Asia/Tokyo')
    // 跨時區：EST 20:00 Jan 15 = JST 10:00 Jan 16
    expect(result).toBe('2024/01/16')
  })

  it('應處理月份和日期的補零', () => {
    const result = formatShortDate(new Date('2024-03-05T00:00:00+08:00'))
    expect(result).toBe('2024/03/05')
  })

  it('應以相同格式處理年末和年初', () => {
    const dec = formatShortDate(new Date('2024-12-31T12:00:00+08:00'))
    const jan = formatShortDate(new Date('2024-01-01T12:00:00+08:00'))
    expect(dec).toBe('2024/12/31')
    expect(jan).toBe('2024/01/01')
  })
})

// ─── formatDateWithWeekday ──────────────────────────────────────────────────────

describe('formatDateWithWeekday', () => {
  it('應附加中文星期', () => {
    // 2024-01-15 是星期一
    const result = formatDateWithWeekday(new Date('2024-01-15T12:00:00+08:00'))
    expect(result).toBe('2024/01/15 (一)')
  })

  it('應正確識別週日', () => {
    // 2024-01-14 是星期日
    const result = formatDateWithWeekday(new Date('2024-01-14T12:00:00+08:00'))
    expect(result).toBe('2024/01/14 (日)')
  })

  it('應支援時區', () => {
    // 2024-01-15 20:00 UTC = 2024-01-16 05:00 Asia/Tokyo
    const result = formatDateWithWeekday(new Date('2024-01-15T20:00:00Z'), 'Asia/Tokyo')
    expect(result).toBe('2024/01/16 (二)') // Jan 16 is Tuesday
  })
})

// ─── formatYmdInTimezone ────────────────────────────────────────────────────────

describe('formatYmdInTimezone', () => {
  it('應在指定時區輸出 YYYY-MM-DD', () => {
    const result = formatYmdInTimezone('2026-03-15T23:30:00.000Z', 'Asia/Taipei')
    expect(result).toBe('2026-03-16')
  })

  it('應處理跨日時區轉換', () => {
    const result = formatYmdInTimezone('2026-03-15T01:30:00.000Z', 'America/Los_Angeles')
    expect(result).toBe('2026-03-14')
  })

  it('應處理 Date 物件輸入', () => {
    const result = formatYmdInTimezone(new Date('2026-03-15T08:00:00.000Z'), 'Asia/Taipei')
    expect(result).toBe('2026-03-15')
  })

  it('無效輸入應拋錯', () => {
    expect(() => formatYmdInTimezone('invalid-date', 'Asia/Taipei')).toThrow()
  })
})

// ─── formatYearMonth ────────────────────────────────────────────────────────────

describe('formatYearMonth', () => {
  it('應以預設 zh-TW locale 輸出年月', () => {
    const result = formatYearMonth(new Date('2024-01-15'))
    expect(result).toBe('2024年1月')
  })

  it('應支援自訂 locale', () => {
    const result = formatYearMonth(new Date('2024-03-10'), 'en')
    expect(result).toMatch(/March 2024/)
  })

  it('應處理年終', () => {
    const result = formatYearMonth(new Date('2024-12-31'))
    expect(result).toBe('2024年12月')
  })

  it('應接受字串輸入', () => {
    const result = formatYearMonth('2024-06-15')
    expect(result).toBe('2024年6月')
  })
})
