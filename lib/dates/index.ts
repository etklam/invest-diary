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
