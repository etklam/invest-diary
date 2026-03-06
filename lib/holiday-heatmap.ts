import type { Diary } from '~/types/diary'

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
  'Australia/Sydney': 'AU'
}

export const resolveCountryCodeFromTimezone = (timezone: string): string | null => {
  return TIMEZONE_COUNTRY_MAP[timezone] || null
}

export const toDateKeyInTimezone = (date: Date | string, timezone: string): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  return formatter.format(dateObj)
}

export const buildDailyActivityMap = (diaries: Diary[], timezone: string): Set<string> => {
  const activeDays = new Set<string>()
  diaries.forEach((diary) => {
    const key = toDateKeyInTimezone(diary.date || diary.createdAt, timezone)
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
