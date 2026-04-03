import { ref, computed, onMounted, watch } from 'vue'
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { isAuthSessionError } from '~/lib/auth/session-error'
import type { Diary, DiariesApiResponse } from '~/types/diary'
import {
  buildDailyActivityMap,
  buildHolidaySet,
  calculateMonthCoverage,
  resolveCountryCodeFromTimezone,
  toDateKeyInTimezone,
  type NagerHoliday
} from '~/lib/holiday-heatmap'

export const useCalendar = () => {
  const { isAuthenticated, user } = useAuth()
  const { getTimezone } = useTimezone()
  const { runWithAuthRecovery } = useAuthRecovery()

  // State
  const now = new Date()
  const userTimezone = computed(() => user.value?.timezone || getTimezone() || 'Asia/Taipei')
  
  // Get current date in user timezone
  const getNowInTimezone = () => {
    const tz = userTimezone.value
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: tz,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    })
    const parts = formatter.formatToParts(new Date())
    const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
    const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1
    const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
    return { year, month, day }
  }

  const initialDate = getNowInTimezone()
  const currentYear = ref(initialDate.year)
  const currentMonth = ref(initialDate.month)
  const diaries = ref<Diary[]>([])
  const holidayDateSet = ref<Set<string>>(new Set())
  const excludeHolidaysInStats = ref(true)
  const loadingHolidays = ref(false)
  const pending = ref(false)

  // Constants
  const weekDays = ['日', '一', '二', '三', '四', '五', '六']

  // Computed
  const daysInMonth = computed(() => {
    return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
  })

  const firstDayOfWeek = computed(() => {
    // We need to know which weekday the 1st of the month is in the USER'S timezone.
    // This is tricky because JS Date is always local.
    // Let's use the year/month and create a date, then check its weekday.
    const firstDay = new Date(currentYear.value, currentMonth.value, 1)
    // To be precise, we should check what day it is in that timezone.
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: userTimezone.value,
      weekday: 'narrow'
    })
    // But weekday: 'narrow' returns 'S', 'M', etc. 
    // Let's use weekday: 'long' or just calculate offset.
    // Actually, creating a date at noon on the 1st in that timezone is safest for getting the day.
    return new Date(currentYear.value, currentMonth.value, 1).getDay()
  })

  const activeDayKeys = computed(() => {
    return buildDailyActivityMap(diaries.value, userTimezone.value)
  })

  const monthDiaryCount = computed(() => {
    let active = 0
    for (let day = 1; day <= daysInMonth.value; day++) {
      const key = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      if (activeDayKeys.value.has(key)) active++
    }
    return active
  })

  const monthCoverage = computed(() => {
    const result = calculateMonthCoverage({
      year: currentYear.value,
      month: currentMonth.value,
      activeDays: activeDayKeys.value,
      excludedDays: excludeHolidaysInStats.value ? holidayDateSet.value : new Set<string>()
    })
    return result.coverage
  })

  const diaryMap = computed(() => {
    const map = new Map<string, Diary>()
    diaries.value.forEach(diary => {
      const key = toDateKeyInTimezone(diary.date || diary.createdAt, userTimezone.value)
      map.set(key, diary)
    })
    return map
  })

  // Methods
  const fetchDiaries = async () => {
    if (!isAuthenticated.value) return
    pending.value = true
    try {
      const response = await runWithAuthRecovery(() => $fetch<DiariesApiResponse>('/api/diaries?limit=1000'))
      diaries.value = response.data
    } catch (error) {
      if (isAuthSessionError(error)) return
      console.error('獲取日記失敗:', error)
    } finally {
      pending.value = false
    }
  }

  const loadHolidays = async () => {
    if (!excludeHolidaysInStats.value) {
      holidayDateSet.value = new Set()
      return
    }

    const countryCode = resolveCountryCodeFromTimezone(userTimezone.value)
    if (!countryCode) {
      holidayDateSet.value = new Set()
      return
    }

    loadingHolidays.value = true
    try {
      const years = [currentYear.value - 1, currentYear.value, currentYear.value + 1]
      const holidayDates = new Set<string>()

      for (const year of years) {
        const cacheKey = `holiday_cache_${countryCode}_${year}`
        const cached = localStorage.getItem(cacheKey)
        let holidays: NagerHoliday[] | null = null

        if (cached) {
          const parsed = JSON.parse(cached) as { expiresAt: number, data: NagerHoliday[] }
          if (parsed.expiresAt > Date.now()) {
            holidays = parsed.data
          }
        }

        if (!holidays) {
          const response = await $fetch<{ success: boolean, data: NagerHoliday[] }>('/api/holidays', {
            query: { year, countryCode }
          })
          holidays = response.data
          localStorage.setItem(cacheKey, JSON.stringify({
            expiresAt: Date.now() + 24 * 60 * 60 * 1000,
            data: holidays
          }))
        }

        buildHolidaySet(holidays).forEach(date => holidayDates.add(date))
      }

      holidayDateSet.value = holidayDates
    } catch (error) {
      console.error('載入假期失敗:', error)
      holidayDateSet.value = new Set()
    } finally {
      loadingHolidays.value = false
    }
  }

  const previousMonth = () => {
    if (currentMonth.value === 0) {
      currentMonth.value = 11
      currentYear.value--
    } else {
      currentMonth.value--
    }
  }

  const nextMonth = () => {
    if (currentMonth.value === 11) {
      currentMonth.value = 0
      currentYear.value++
    } else {
      currentMonth.value++
    }
  }

  const goToToday = () => {
    const today = getNowInTimezone()
    currentYear.value = today.year
    currentMonth.value = today.month
  }

  const hasDiary = (day: number): boolean => {
    const key = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return activeDayKeys.value.has(key)
  }

  const getDiaryForDay = (day: number): Diary | undefined => {
    const key = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return diaryMap.value.get(key)
  }

  const isToday = (day: number): boolean => {
    const today = getNowInTimezone()
    return today.day === day &&
           today.month === currentMonth.value &&
           today.year === currentYear.value
  }

  const isExcludedHoliday = (day: number): boolean => {
    if (!excludeHolidaysInStats.value) return false
    const key = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return holidayDateSet.value.has(key)
  }

  const heatmapDays = computed(() => {
    const totalDays = 371 // About a year
    // end date is today
    const tz = userTimezone.value
    const rows: Array<Array<{ dateKey: string, level: 0 | 1, excluded: boolean } | null>> = []
    const days: Array<{ dateKey: string, level: 0 | 1, excluded: boolean }> = []

    const endDate = new Date()
    
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(endDate)
      d.setDate(endDate.getDate() - i)
      const key = toDateKeyInTimezone(d, tz)
      days.push({
        dateKey: key,
        level: activeDayKeys.value.has(key) ? 1 : 0,
        excluded: excludeHolidaysInStats.value && holidayDateSet.value.has(key)
      })
    }

    // To align weeks properly, we need to know the weekday of the first day in the array
    const firstDate = new Date(days[0]!.dateKey)
    const startWeekday = firstDate.getDay()
    let cursor = 0

    for (let week = 0; week < 54; week++) { // 53 or 54 weeks
      const row: Array<{ dateKey: string, level: 0 | 1, excluded: boolean } | null> = []
      for (let weekday = 0; weekday < 7; weekday++) {
        if (week === 0 && weekday < startWeekday) {
          row.push(null)
        } else if (cursor < days.length) {
          row.push(days[cursor] || null)
          cursor++
        } else {
          row.push(null)
        }
      }
      if (row.some(r => r !== null)) {
        rows.push(row)
      }
    }
    return rows
  })

  onMounted(() => {
    excludeHolidaysInStats.value = localStorage.getItem('exclude_holidays_in_stats') !== 'false'
    if (isAuthenticated.value) {
      fetchDiaries()
      loadHolidays()
    }
  })

  watch(isAuthenticated, (authenticated) => {
    if (authenticated) {
      fetchDiaries()
      loadHolidays()
    }
  })

  watch([currentYear, currentMonth], () => {
    loadHolidays()
  })

  return {
    currentYear,
    currentMonth,
    diaries,
    pending,
    weekDays,
    daysInMonth,
    firstDayOfWeek,
    monthDiaryCount,
    monthCoverage,
    loadingHolidays,
    holidayDateSet,
    heatmapDays,
    fetchDiaries,
    previousMonth,
    nextMonth,
    goToToday,
    hasDiary,
    getDiaryForDay,
    isToday,
    isExcludedHoliday
  }
}
