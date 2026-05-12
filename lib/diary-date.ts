/**
 * lib/diary-date.ts
 *
 * 此模組已重構：UTC 正規化函數移至 lib/dates/normalize.ts，
 * 格式化函數移至 lib/dates/format.ts。
 *
 * 此處保留向後相容的 re-export。
 */

export { toUtcNoonDate, getUtcDayRange, toDateTimeLocalValue } from '~/lib/dates/normalize'
export { formatYmdInTimezone } from '~/lib/dates/format'
