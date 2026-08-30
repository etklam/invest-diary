import type { DiaryResponse } from '~/lib/contracts/diary'
import { resolveCountryCodeFromTimezone, getUserYmdInTimezone } from '~/lib/dates/user-tz'

// Re-export 維持向後相容（callers 可直接從 holiday-heatmap 匯入）
export { resolveCountryCodeFromTimezone }

/**
 * @deprecated 改用 `~/lib/dates/user-tz` 的 `getUserYmdInTimezone`。
 * 此函數保留作為薄 wrapper，行為完全等價。
 */
export const toDateKeyInTimezone = (date: Date | string, timezone: string): string => {
  return getUserYmdInTimezone(date, timezone)
}

export const buildDailyActivityMap = (diaries: DiaryResponse[], timezone: string): Set<string> => {
  const activeDays = new Set<string>()
  diaries.forEach((diary) => {
    const key = toDateKeyInTimezone(diary.date, timezone)
    activeDays.add(key)
  })
  return activeDays
}

interface CoverageInput {
  year: number
  month: number
  activeDays: Set<string>
  excludedDays: Set<string>
}

export const calculateMonthCoverage = ({ year, month, activeDays, excludedDays }: CoverageInput) => {
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  let activeCount = 0
  let eligibleDays = 0

  for (let day = 1; day <= daysInMonth; day++) {
    const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    if (excludedDays.has(key)) {
      continue
    }
    eligibleDays++
    if (activeDays.has(key)) {
      activeCount++
    }
  }

  const coverage = eligibleDays === 0 ? '0%' : `${Math.round((activeCount / eligibleDays) * 100)}%`

  return {
    activeCount,
    eligibleDays,
    coverage
  }
}

export interface NagerHoliday {
  date: string
  localName: string
  name: string
  countryCode: string
}

export const buildHolidaySet = (holidays: NagerHoliday[]): Set<string> => {
  return new Set(holidays.map(holiday => holiday.date))
}
