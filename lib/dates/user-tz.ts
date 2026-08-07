/**
 * lib/dates/user-tz.ts
 * 使用者時區操作的 deep module — 單一真相源。
 *
 * 所有「給我 user timezone 的某天 / 今天日期 / 該天的 UTC 範圍」
 * 類操作都收斂到此處，取代原本散落在 reviews.get.ts、
 * holiday-heatmap.ts、useTimezone.ts 的 inline 邏輯。
 *
 * 核心設計：
 *   - getUserDayRange 回傳 half-open [start, end) 區間，
 *     end 是 user-local 下一天的 00:00:00.000 對應的 UTC instant。
 *     相比 [start, 23:59:59.999] 更精確、不漏 ms。
 *   - DST 安全：使用 Intl.DateTimeFormat formatToParts 反查 offset，
 *     對 DST 切換日做兩段式 offset 驗證（繼承自 reviews.get.ts 原有演算法）。
 */

import { formatYmdInTimezone } from './format'

export { formatYmdInTimezone as getUserYmdInTimezone } from './format'

// ─── 內部輔助 ──────────────────────────────────────────────────────────────

type DateInput = Date | string

function toDateInstance(input: DateInput): Date {
  if (input instanceof Date) return input
  return new Date(input)
}

/**
 * 取得給定 Date 在指定 timezone 下的 Y/M/D/H/M/S parts。
 * 使用 Intl.DateTimeFormat formatToParts，DST 安全。
 */
function getZonedParts(date: Date, timeZone: string) {
  const values = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(date)

  const part = (type: string) => Number(values.find((item) => item.type === type)?.value)

  const hour = part('hour')
  return {
    year: part('year'),
    month: part('month'),
    day: part('day'),
    // Intl 在 hour12: false 下可能回傳 "24"，需歸零
    hour: hour === 24 ? 0 : hour,
    minute: part('minute'),
    second: part('second'),
  }
}

/**
 * 計算 date 在指定 timezone 的 offset（毫秒）。
 * offset = zoned wall-clock 對應的 UTC instant - date 的 UTC instant。
 */
function getZonedOffsetMs(date: Date, timeZone: string): number {
  const parts = getZonedParts(date, timeZone)
  const utcAtSecond = date.getTime() - date.getUTCMilliseconds()
  return (
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
    utcAtSecond
  )
}

/**
 * 把 user-local 的 wall-clock parts（年月日時分秒毫秒）轉成 UTC Date。
 * 用兩段式 offset 驗證處理 DST 跳躍。
 */
export function zonedPartsToUtc(
  parts: {
    year: number
    month: number
    day: number
    hour: number
    minute: number
    second: number
    millisecond: number
  },
  timeZone: string,
): Date {
  const utcGuess = new Date(
    Date.UTC(
      parts.year,
      parts.month - 1,
      parts.day,
      parts.hour,
      parts.minute,
      parts.second,
      parts.millisecond,
    ),
  )
  const offset = getZonedOffsetMs(utcGuess, timeZone)
  const resolved = new Date(utcGuess.getTime() - offset)
  const resolvedOffset = getZonedOffsetMs(resolved, timeZone)
  return new Date(utcGuess.getTime() - resolvedOffset)
}

// ─── 公開 API ─────────────────────────────────────────────────────────────

export interface UserDayRange {
  /** User-local 該天 00:00:00.000 對應的 UTC instant (inclusive) */
  start: Date
  /** User-local 下一天 00:00:00.000 對應的 UTC instant (exclusive) */
  end: Date
}

/** Resolve a strict civil YYYY-MM-DD interval in a user's timezone. */
export function getUserYmdDayRange(ymd: string, timeZone: string): UserDayRange {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd)
  if (!match) throw new Error('Invalid date input')

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(0)
  date.setUTCFullYear(year, month - 1, day)
  date.setUTCHours(0, 0, 0, 0)
  if (
    date.getUTCFullYear() !== year
    || date.getUTCMonth() !== month - 1
    || date.getUTCDate() !== day
  ) throw new Error('Invalid date input')

  const nextDay = new Date(date)
  nextDay.setUTCDate(nextDay.getUTCDate() + 1)

  return {
    start: zonedPartsToUtc({ year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 }, timeZone),
    end: zonedPartsToUtc({
      year: nextDay.getUTCFullYear(),
      month: nextDay.getUTCMonth() + 1,
      day: nextDay.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    }, timeZone),
  }
}

/**
 * 取得涵蓋某個 UTC instant 所對應 user-local 「該天」的 UTC 區間。
 *
 * 回傳 half-open [start, end)：
 *   - start = user-local 當天 00:00:00.000 的 UTC instant
 *   - end   = user-local 下一天 00:00:00.000 的 UTC instant
 *
 * 使用端查詢時用 `gte: start` + `lt: end` 即可涵蓋整天，不漏 ms。
 *
 * @example
 *   getUserDayRange(new Date('2026-06-15T02:00:00Z'), 'Asia/Taipei')
 *   // → { start: 2026-06-14T16:00:00.000Z, end: 2026-06-15T16:00:00.000Z }
 */
export function getUserDayRange(input: DateInput, timeZone: string): UserDayRange {
  const date = toDateInstance(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input')
  }

  const { year, month, day } = getZonedParts(date, timeZone)

  const start = zonedPartsToUtc(
    { year, month, day, hour: 0, minute: 0, second: 0, millisecond: 0 },
    timeZone,
  )

  // 計算 user-local 下一天的 YMD：直接用 Date.UTC 做日進位（跨月/跨年自動）
  const nextDayDate = new Date(Date.UTC(year, month - 1, day + 1, 0, 0, 0, 0))
  const end = zonedPartsToUtc(
    {
      year: nextDayDate.getUTCFullYear(),
      month: nextDayDate.getUTCMonth() + 1,
      day: nextDayDate.getUTCDate(),
      hour: 0,
      minute: 0,
      second: 0,
      millisecond: 0,
    },
    timeZone,
  )

  return { start, end }
}

/**
 * 取得 user timezone 的「今天」YMD（YYYY-MM-DD）。
 *
 * 若不傳 `now`，以當下 UTC instant 為準。
 *
 * @example
 *   getUserTodayYmd('Asia/Taipei', new Date('2026-06-15T18:00:00Z'))
 *   // → "2026-06-16"  (Taipei is UTC+8)
 */
export function getUserTodayYmd(timeZone: string, now: Date = new Date()): string {
  return formatYmdInTimezone(now, timeZone)
}

// ─── Timezone → Country code mapping ─────────────────────────────────────

const TIMEZONE_COUNTRY_MAP: Record<string, string> = {
  'Asia/Taipei': 'TW',
  'Asia/Hong_Kong': 'HK',
  'Asia/Shanghai': 'CN',
  'Asia/Singapore': 'SG',
  'Asia/Tokyo': 'JP',
  'Asia/Seoul': 'KR',
  'America/New_York': 'US',
  'America/Chicago': 'US',
  'America/Los_Angeles': 'US',
  'America/Toronto': 'CA',
  'Europe/London': 'GB',
  'Europe/Paris': 'FR',
  'Europe/Berlin': 'DE',
  'Australia/Sydney': 'AU',
}

/**
 * 將 IANA timezone 對應到 ISO 3166-1 alpha-2 country code。
 * 用於 holiday API（Nager）的 country 參數。
 *
 * @returns country code 或 null（未映射的 timezone）
 */
export function resolveCountryCodeFromTimezone(timezone: string): string | null {
  return TIMEZONE_COUNTRY_MAP[timezone] ?? null
}
