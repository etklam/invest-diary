/**
 * lib/dates/format.ts
 * 集中式日期格式化函數
 *
 * 將原本分散在 lib/utils.ts、lib/financialFreedom.ts、
 * lib/diary-date.ts 的日期格式化邏輯統一到此處。
 */

// ─── 型別 ──────────────────────────────────────────────────────────────────────

type DateInput = Date | string | number

export interface DateFormatOptions {
  /** IANA 時區 (預設: Asia/Taipei) */
  timezone?: string
  /** BCP 47 locale (預設: zh-TW) */
  locale?: string
}

// ─── 內部輔助 ──────────────────────────────────────────────────────────────────

function toDateInstance(input: DateInput): Date {
  if (input instanceof Date) return input
  return new Date(input)
}

// ─── 核心函數 ──────────────────────────────────────────────────────────────────

/**
 * 格式化日期 (年月日 + 時間)
 * 這是統合後的 canonical formatDate。
 *
 * @example
 *   formatDate(new Date('2024-01-15T10:30:00'))
 *   // → "2024/01/15 10:30"
 */
export function formatDate(input: DateInput, options?: DateFormatOptions): string {
  const date = toDateInstance(input)
  const tz = options?.timezone || 'Asia/Taipei'
  const locale = options?.locale || 'zh-TW'

  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: tz,
  }).format(date)
}

// ─── 衍生函數 ──────────────────────────────────────────────────────────────────

/**
 * 格式化簡短日期 (年/月/日)
 *
 * @example
 *   formatShortDate(new Date('2024-01-15'), 'Asia/Taipei')
 *   // → "2024/01/15"
 */
export function formatShortDate(input: DateInput, timezone?: string): string {
  const date = toDateInstance(input)
  const tz = timezone || 'Asia/Taipei'

  return new Intl.DateTimeFormat('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    timeZone: tz,
  }).format(date)
}

/**
 * 格式化日期並附加星期
 *
 * @example
 *   formatDateWithWeekday(new Date('2024-01-15'), 'Asia/Taipei')
 *   // → "2024/01/15 (一)"
 */
export function formatDateWithWeekday(input: DateInput, timezone?: string): string {
  const date = toDateInstance(input)
  const tz = timezone || 'Asia/Taipei'

  const formattedDate = formatShortDate(input, tz)

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[date.getDay()]

  return `${formattedDate} (${weekday})`
}

/**
 * 格式化日期為 YYYY-MM-DD（指定時區）
 *
 * @example
 *   formatYmdInTimezone('2026-03-15T23:30:00.000Z', 'Asia/Taipei')
 *   // → "2026-03-16"
 */
export function formatYmdInTimezone(input: DateInput, timeZone: string): string {
  const date = toDateInstance(input)
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid date input')
  }

  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)

  const year = parts.find((p) => p.type === 'year')?.value
  const month = parts.find((p) => p.type === 'month')?.value
  const day = parts.find((p) => p.type === 'day')?.value

  if (!year || !month || !day) {
    throw new Error('Failed to format date in timezone')
  }

  return `${year}-${month}-${day}`
}

/**
 * 格式化日期為年月（用於財務自由等場景）
 *
 * @example
 *   formatYearMonth(new Date('2024-01-15'), 'zh-TW')
 *   // → "2024年1月"
 */
export function formatYearMonth(date: DateInput, locale: string = 'zh-TW'): string {
  const d = toDateInstance(date)
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
  }).format(d)
}
