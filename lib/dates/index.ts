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
  formatShortDate,
  formatDateWithWeekday,
  formatYmdInTimezone,
  formatYearMonth,
} from './format'
export type { DateFormatOptions } from './format'

// ─── 正規化 ────────────────────────────────────────────────────────────────────
export { toUtcNoonDate, getUtcDayRange, toDateTimeLocalValue } from './normalize'

// ─── 使用者時區操作（deep module）────────────────────────────────────────────
export {
  getUserDayRange,
  getUserTodayYmd,
  getUserYmdInTimezone,
  resolveCountryCodeFromTimezone,
} from './user-tz'
export type { UserDayRange } from './user-tz'
