/**
 * lib/dates/index.ts
 * 日期處理模組的統一匯出入口
 *
 * 用法：
 *   import { formatDate, toUtcNoonDate } from '~/lib/dates'
 */

// ─── 格式化 ────────────────────────────────────────────────────────────────────
export {
  formatDate,
  formatCalendarDate,
  formatUserDateTime,
  formatShortDate,
  formatDateWithWeekday,
  formatYmdInTimezone,
  formatYearMonth,
  getDateTimeFormat,
} from './format'
export type { CalendarDateFormatOptions, DateFormatOptions, UserDateTimeFormatOptions } from './format'

// ─── 正規化 ────────────────────────────────────────────────────────────────────
export { toUtcNoonDate, toCalendarDateWire, getUtcDayRange, toDateTimeLocalValue } from './normalize'

// ─── 使用者時區操作（deep module）────────────────────────────────────────────
export {
  getUserDayRange,
  getUserYmdDayRange,
  getUserTodayYmd,
  getUserYmdInTimezone,
  resolveCountryCodeFromTimezone,
} from './user-tz'
export type { UserDayRange } from './user-tz'
