import { ref, computed, onMounted, watch } from 'vue'
import { useAuthRecovery } from '~/composables/useAuthRecovery'
import { isAuthSessionError } from '~/lib/auth/session-error'
import { resolveErrorMessage } from '~/composables/useErrorI18n'
import type { DiaryActivityDay } from '~/types/diary'
import { formatYmdInTimezone } from '~/lib/dates/format'
import {
  buildHolidaySet,
  calculateMonthCoverage,
  resolveCountryCodeFromTimezone,
  type NagerHoliday
} from '~/lib/holiday-heatmap'

export const useCalendar = () => {
  const { isAuthenticated, user } = useAuth()
  const { getTimezone } = useTimezone()
  const { runWithAuthRecovery } = useAuthRecovery()
  const toast = useToast()
  const { t } = useI18n()

  // State
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
  const activity = ref<DiaryActivityDay[]>([])
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
    // Calendar cells represent the user's civil date, not the server locale.
    return new Date(Date.UTC(currentYear.value, currentMonth.value, 1)).getUTCDay()
  })

  const activeDayKeys = computed(() => {
    return new Set(activity.value.map(day => day.date))
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

  const activityMap = computed(() => {
    const map = new Map<string, DiaryActivityDay>()
    activity.value.forEach(day => {
      map.set(day.date, day)
    })
    return map
  })

  // Methods
  const shiftDate = (dateKey: string, days: number): string => {
    const date = new Date(`${dateKey}T00:00:00Z`)
    date.setUTCDate(date.getUTCDate() + days)
    return date.toISOString().slice(0, 10)
  }

  const mergeActivity = (days: DiaryActivityDay[]) => {
    const byDate = new Map(activity.value.map(day => [day.date, day]))
    days.forEach(day => byDate.set(day.date, day))
    activity.value = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date))
  }

  const loadActivityRange = async (dateFrom: string, dateTo: string) => {
    const response = await runWithAuthRecovery(() => $fetch<{
      data: DiaryActivityDay[]
    }>('/api/diaries/activity', { query: { dateFrom, dateTo } }))
    mergeActivity(response.data ?? [])
  }

  const getCurrentMonthRange = () => {
    const month = String(currentMonth.value + 1).padStart(2, '0')
    const dateFrom = `${currentYear.value}-${month}-01`
    const lastDay = new Date(Date.UTC(currentYear.value, currentMonth.value + 1, 0)).getUTCDate()
    return { dateFrom, dateTo: `${currentYear.value}-${month}-${String(lastDay).padStart(2, '0')}` }
  }

  const loadMonthActivity = async () => {
    if (!isAuthenticated.value) return
    pending.value = true
    try {
      const range = getCurrentMonthRange()
      await loadActivityRange(range.dateFrom, range.dateTo)
    } catch (error) {
      if (isAuthSessionError(error)) return
      toast.error(resolveErrorMessage(error, t))
    } finally {
      pending.value = false
    }
  }

  const fetchActivity = async () => {
    if (!isAuthenticated.value) return
    pending.value = true
    try {
      const today = formatYmdInTimezone(new Date(), userTimezone.value)
      await loadActivityRange(shiftDate(today, -(371 - 1)), today)
      await loadMonthActivity()
    } catch (error) {
      if (isAuthSessionError(error)) return
      toast.error(resolveErrorMessage(error, t))
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
    } catch {
      // Holidays are an auxiliary feature backed by external date.nager.at;
      // on failure, degrade silently (no holiday markers) instead of toasting.
      holidayDateSet.value = new Set()
    } finally {
      loadingHolidays.value = false
    }
  }

  const previousMonth = () => {
    if (currentMonth.value === 0) { // 0-based: January
      currentMonth.value = 11 // 0-based: December
      currentYear.value--
    } else {
      currentMonth.value--
    }
  }

  const nextMonth = () => {
    if (currentMonth.value === 11) { // 0-based: December
      currentMonth.value = 0 // 0-based: January
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

  const getActivityForDay = (day: number): DiaryActivityDay | undefined => {
    const key = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
    return activityMap.value.get(key)
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

    const endDate = new Date(`${formatYmdInTimezone(new Date(), tz)}T00:00:00Z`)
    
    for (let i = totalDays - 1; i >= 0; i--) {
      const d = new Date(endDate)
      d.setUTCDate(endDate.getUTCDate() - i)
      const key = d.toISOString().slice(0, 10)
      days.push({
        dateKey: key,
        level: activeDayKeys.value.has(key) ? 1 : 0,
        excluded: excludeHolidaysInStats.value && holidayDateSet.value.has(key)
      })
    }

    // To align weeks properly, we need to know the weekday of the first day in the array
    const firstDate = new Date(`${days[0]!.dateKey}T00:00:00Z`)
    const startWeekday = firstDate.getUTCDay()
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
      fetchActivity()
      loadHolidays()
    }
  })

  watch(isAuthenticated, (authenticated) => {
    if (authenticated) {
      fetchActivity()
      loadHolidays()
    }
  })

  watch([currentYear, currentMonth], () => {
    loadMonthActivity()
    loadHolidays()
  })

  return {
    currentYear,
    currentMonth,
    activity,
    pending,
    weekDays,
    daysInMonth,
    firstDayOfWeek,
    monthDiaryCount,
    monthCoverage,
    loadingHolidays,
    holidayDateSet,
    heatmapDays,
    fetchActivity,
    previousMonth,
    nextMonth,
    goToToday,
    hasDiary,
    getActivityForDay,
    isToday,
    isExcludedHoliday
  }
}
