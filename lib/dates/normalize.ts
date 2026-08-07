/**
 * lib/dates/normalize.ts
 * UTC 正規化輔助函數
 *
 * 將日期輸入正規化為 UTC 時間，用於日記資料的儲存與查詢。
 * 這些函數原本分散在 lib/diary-date.ts。
 *
 * 注意：此處的 toDate() 是內部使用的，lib/position-state.ts 的
 * toDate() 是獨立的（Date | string → Date 轉換），兩者目的不同。
 */

// ─── YYYY-MM-DD 解析 ──────────────────────────────────────────────────────────

function parseYyyyMmDd(dateStr: string): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (month < 1 || month > 12 || day < 1 || day > 31) return null

  // Date.UTC() normalizes overflow (2026-02-31 → 2026-03-03), which is
  // exactly the silent data corruption this boundary is meant to prevent.
  const calendarDate = new Date(0)
  calendarDate.setUTCFullYear(year, month - 1, day)
  calendarDate.setUTCHours(12, 0, 0, 0)
  if (
    calendarDate.getUTCFullYear() !== year
    || calendarDate.getUTCMonth() !== month - 1
    || calendarDate.getUTCDate() !== day
  ) return null

  return { year, month, day }
}

/** Return true only for a real Gregorian calendar date in YYYY-MM-DD form. */
export function isValidYyyyMmDd(value: unknown): value is string {
  return typeof value === 'string' && parseYyyyMmDd(value) !== null
}

// ─── 公開 API ─────────────────────────────────────────────────────────────────

/**
 * 將日期輸入正規化為 UTC 中午。
 * 日記日期儲存為 UTC noon 以避免時區邊界導致的日期偏移。
 *
 * @example
 *   toUtcNoonDate('2026-03-15')
 *   // → 2026-03-15T12:00:00.000Z
 */
export function toUtcNoonDate(input: string | Date): Date {
  if (typeof input === 'string') {
    const datePart = /^(\d{4}-\d{2}-\d{2})(?:$|[Tt ])/u.exec(input)?.[1]
    if (datePart) {
      const parsedYmd = parseYyyyMmDd(datePart)
      if (!parsedYmd) throw new Error('Invalid date input')

      const normalized = new Date(0)
      normalized.setUTCFullYear(parsedYmd.year, parsedYmd.month - 1, parsedYmd.day)
      normalized.setUTCHours(12, 0, 0, 0)
      return normalized
    }
  }

  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input')
  }

  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12, 0, 0, 0),
  )
}

/**
 * 取得 UTC 日的起迄範圍。
 *
 * @example
 *   getUtcDayRange('2026-03-15')
 *   // → { startOfDayUtc: 2026-03-15T00:00:00.000Z, endOfDayUtc: 2026-03-15T23:59:59.999Z }
 */
export function getUtcDayRange(input: string | Date): {
  startOfDayUtc: Date
  endOfDayUtc: Date
} {
  const noon = toUtcNoonDate(input)
  const year = noon.getUTCFullYear()
  const month = noon.getUTCMonth()
  const day = noon.getUTCDate()

  return {
    startOfDayUtc: new Date(Date.UTC(year, month, day, 0, 0, 0, 0)),
    endOfDayUtc: new Date(Date.UTC(year, month, day, 23, 59, 59, 999)),
  }
}

/**
 * 將日期轉換為 <input type="datetime-local"> 的值。
 * 保證分鐘精度的來回轉換（new Date(value).toISOString() 往返一致）。
 *
 * @example
 *   toDateTimeLocalValue('2026-03-15T12:34:00.000Z')
 *   // → "2026-03-15T12:34"
 */
export function toDateTimeLocalValue(input: string | Date): string {
  const date = input instanceof Date ? input : new Date(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input')
  }

  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return localDate.toISOString().slice(0, 16)
}
