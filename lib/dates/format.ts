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

export interface UserDateTimeFormatOptions {
  /** User profile 的 IANA 時區 */
  timezone: string
  /** 目前 UI 使用的 BCP 47 locale */
  locale: string
  /** 顯示形態；省略時為完整日期與時間 */
  format?: Intl.DateTimeFormatOptions
}

// ─── 內部輔助 ──────────────────────────────────────────────────────────────────

function toDateInstance(input: DateInput): Date {
  if (input instanceof Date) return input
  return new Date(input)
}

// ponytail: Intl.DateTimeFormat 是瀏覽器最貴的 constructor 之一，熱路徑
// (timeline 每項目每渲染多次) 不該每次重建。以 locale+options 為 key 做
// module-level cache；組合數是靜態小集合，無需 eviction。
const formatterCache = new Map<string, Intl.DateTimeFormat>()

export function getDateTimeFormat(locale: string, options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(options)}`
  let formatter = formatterCache.get(key)
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, options)
    formatterCache.set(key, formatter)
  }
  return formatter
}

/**
 * User profile timezone 的唯一日期/時間顯示入口。
 *
 * `format` 只控制顯示欄位；timezone 強制由此 semantic API 的參數提供，
 * Web caller 應以 resolveUserTimezone(user) 取得它。React Native 可保留同一
 * semantic contract，改用自己的 rendering implementation。
 */
export function formatUserDateTime(
  input: DateInput,
  { timezone, locale, format }: UserDateTimeFormatOptions,
): string {
  const date = toDateInstance(input)
  return getDateTimeFormat(locale, {
    ...(format ?? {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }),
    timeZone: timezone,
  }).format(date)
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
  const tz = options?.timezone || 'Asia/Taipei'
  const locale = options?.locale || 'zh-TW'

  return formatUserDateTime(input, { timezone: tz, locale })
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
  const tz = timezone || 'Asia/Taipei'

  return formatUserDateTime(input, {
    timezone: tz,
    locale: 'zh-TW',
    format: { year: 'numeric', month: '2-digit', day: '2-digit' },
  })
}

/**
 * 格式化日期並附加星期
 *
 * @example
 *   formatDateWithWeekday(new Date('2024-01-15'), 'Asia/Taipei')
 *   // → "2024/01/15 (一)"
 */
export function formatDateWithWeekday(input: DateInput, timezone?: string): string {
  const tz = timezone || 'Asia/Taipei'

  const formattedDate = formatShortDate(input, tz)

  // 星期必須從目標時區的 YMD 推導，而非 runtime-local 的 getDay()：
  // 跨日 instant + 非 UTC server (如 SSR) 會讓星期與顯示日期對不上。
  const ymd = formatYmdInTimezone(input, tz)
  const weekdayIndex = new Date(`${ymd}T00:00:00Z`).getUTCDay()

  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[weekdayIndex]

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

  const parts = getDateTimeFormat('en-US', {
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
  return formatUserDateTime(date, {
    timezone: 'Asia/Taipei',
    locale,
    format: { year: 'numeric', month: 'long' },
  })
}
