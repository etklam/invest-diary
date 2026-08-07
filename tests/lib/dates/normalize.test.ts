import { describe, it, expect } from 'vitest'
import {
  toUtcNoonDate,
  getUtcDayRange,
  toDateTimeLocalValue,
} from '~/lib/dates/normalize'

// ─── toUtcNoonDate ─────────────────────────────────────────────────────────────

describe('toUtcNoonDate', () => {
  it('應將 YYYY-MM-DD 字串正規化為 UTC 中午', () => {
    const normalized = toUtcNoonDate('2026-03-15')
    expect(normalized.toISOString()).toBe('2026-03-15T12:00:00.000Z')
  })

  it('應將 ISO 日期時間字串正規化為同一天的 UTC 中午', () => {
    const normalized = toUtcNoonDate('2026-03-15T01:23:45.000Z')
    expect(normalized.toISOString()).toBe('2026-03-15T12:00:00.000Z')
  })

  it('應處理 Date 物件輸入', () => {
    const normalized = toUtcNoonDate(new Date('2026-03-15T01:23:45.000Z'))
    expect(normalized.toISOString()).toBe('2026-03-15T12:00:00.000Z')
  })

  it('無效輸入應拋錯', () => {
    expect(() => toUtcNoonDate('invalid')).toThrow('Invalid date input')
  })

  it.each(['2026-02-29', '2026-02-31', '2026-04-31'])('拒絕不存在的日曆日期 %s', (value) => {
    expect(() => toUtcNoonDate(value)).toThrow('Invalid date input')
  })

  it('接受閏年二月二十九日', () => {
    expect(toUtcNoonDate('2024-02-29').toISOString()).toBe('2024-02-29T12:00:00.000Z')
  })

  it('應處理跨月日期', () => {
    const normalized = toUtcNoonDate('2026-01-01')
    expect(normalized.toISOString()).toBe('2026-01-01T12:00:00.000Z')
  })

  it('應處理年末日期', () => {
    const normalized = toUtcNoonDate('2026-12-31')
    expect(normalized.toISOString()).toBe('2026-12-31T12:00:00.000Z')
  })
})

// ─── getUtcDayRange ────────────────────────────────────────────────────────────

describe('getUtcDayRange', () => {
  it('應從正規化日期回傳 UTC 日範圍', () => {
    const normalized = toUtcNoonDate('2026-03-15')
    const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(normalized)

    expect(startOfDayUtc.toISOString()).toBe('2026-03-15T00:00:00.000Z')
    expect(endOfDayUtc.toISOString()).toBe('2026-03-15T23:59:59.999Z')
  })

  it('應直接接受字串輸入', () => {
    const { startOfDayUtc, endOfDayUtc } = getUtcDayRange('2026-03-15')

    expect(startOfDayUtc.toISOString()).toBe('2026-03-15T00:00:00.000Z')
    expect(endOfDayUtc.toISOString()).toBe('2026-03-15T23:59:59.999Z')
  })

  it('應處理 Date 物件輸入', () => {
    const { startOfDayUtc, endOfDayUtc } = getUtcDayRange(new Date('2026-03-15T15:00:00.000Z'))

    expect(startOfDayUtc.toISOString()).toBe('2026-03-15T00:00:00.000Z')
    expect(endOfDayUtc.toISOString()).toBe('2026-03-15T23:59:59.999Z')
  })

  it('應處理月份邊界', () => {
    const { startOfDayUtc, endOfDayUtc } = getUtcDayRange('2026-02-28')

    expect(startOfDayUtc.toISOString()).toBe('2026-02-28T00:00:00.000Z')
    expect(endOfDayUtc.toISOString()).toBe('2026-02-28T23:59:59.999Z')
  })
})

// ─── toDateTimeLocalValue ──────────────────────────────────────────────────────

describe('toDateTimeLocalValue', () => {
  it('應將 ISO 時間轉換為 datetime-local 值並保證來回一致性', () => {
    const iso = '2026-03-15T12:34:00.000Z'
    const localValue = toDateTimeLocalValue(iso)
    const roundTrip = new Date(localValue).toISOString()

    expect(localValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
    expect(roundTrip).toBe(iso)
  })

  it('應接受 Date 物件輸入', () => {
    const date = new Date('2026-03-15T12:34:00.000Z')
    const localValue = toDateTimeLocalValue(date)
    expect(localValue).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)
  })

  it('無效輸入應拋錯', () => {
    expect(() => toDateTimeLocalValue('invalid')).toThrow('Invalid date input')
  })
})
