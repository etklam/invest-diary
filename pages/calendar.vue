<template>
  <div class="calendar-page">
    <header class="fin-card mb-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="kicker">Calendar Intelligence</p>
          <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">
            {{ currentYear }}年 {{ currentMonth + 1 }}月
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="previousMonth"
            class="nav-btn cursor-pointer"
            aria-label="上一個月"
          >
            <Icon name="heroicons:chevron-left" class="h-5 w-5" />
          </button>
          <button
            @click="nextMonth"
            class="nav-btn cursor-pointer"
            aria-label="下一個月"
          >
            <Icon name="heroicons:chevron-right" class="h-5 w-5" />
          </button>
        </div>
      </div>
      <div class="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div class="metric">
          <p class="metric-label">本月天數</p>
          <p class="metric-value">{{ daysInMonth }}</p>
        </div>
        <div class="metric">
          <p class="metric-label">有日記日期</p>
          <p class="metric-value">{{ monthDiaryCount }}</p>
        </div>
        <div class="metric">
          <p class="metric-label">記錄率</p>
          <p class="metric-value">{{ monthCoverage }}</p>
          <p v-if="excludeHolidaysInStats" class="metric-note">
            已排除假期
          </p>
        </div>
      </div>
    </header>

    <section class="fin-card">
      <div class="grid grid-cols-7 gap-1.5 sm:gap-2.5 mb-2">
        <div
          v-for="day in weekDays"
          :key="day"
          class="text-center text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 py-2"
        >
          {{ day }}
        </div>
      </div>

      <div class="grid grid-cols-7 gap-1.5 sm:gap-2.5">
        <div
          v-for="n in firstDayOfWeek"
          :key="'blank-' + n"
          class="h-16 sm:h-24"
        />

        <button
          v-for="day in daysInMonth"
          :key="day"
          type="button"
          @click="handleDateClick(day)"
          class="day-card cursor-pointer"
          :aria-label="`${currentYear}年${currentMonth + 1}月${day}日`"
          :class="{
            'day-card-today': isToday(day),
            'day-card-active': hasDiary(day),
            'day-card-excluded': isExcludedHoliday(day)
          }"
        >
          <div class="text-sm font-semibold text-slate-700 dark:text-slate-200">
            {{ day }}
          </div>
          <div
            v-if="hasDiary(day)"
            class="absolute bottom-2 right-2 h-2.5 w-2.5 rounded-full bg-amber-500"
          />
          <div
            v-if="hasDiary(day)"
            class="mt-2 text-[10px] sm:text-xs text-slate-600 dark:text-slate-400 truncate leading-tight"
          >
            {{ getDiaryTitle(day) }}
          </div>
        </button>
      </div>
    </section>

    <section class="fin-card mt-6">
      <div class="flex items-center justify-between gap-2 mb-3">
        <h2 class="text-lg font-semibold text-slate-900 dark:text-slate-100">近一年活躍 Heatmap</h2>
        <span v-if="loadingHolidays" class="text-xs text-slate-500 dark:text-slate-400">假期同步中...</span>
      </div>
      <div class="heatmap-wrap">
        <div v-for="(week, weekIndex) in heatmapDays" :key="`week-${weekIndex}`" class="heatmap-week">
          <div
            v-for="(cell, dayIndex) in week"
            :key="`cell-${weekIndex}-${dayIndex}`"
            class="heatmap-cell"
            :class="{
              'heatmap-cell-empty': !cell,
              'heatmap-cell-level-0': cell && cell.level === 0 && !cell.excluded,
              'heatmap-cell-level-1': cell && cell.level === 1,
              'heatmap-cell-excluded': cell && cell.excluded
            }"
            :title="cell ? `${cell.dateKey} ${cell.level === 1 ? '有寫' : '未寫'}${cell.excluded ? '（假期排除）' : ''}` : ''"
          />
        </div>
      </div>
    </section>

    <div class="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
      <button
        @click="showQuickModal = true"
        class="action action-primary cursor-pointer"
      >
        <Icon name="heroicons:bolt" class="mr-2 h-5 w-5" />
        快速日記
      </button>
      <button
        @click="goToToday"
        class="action action-secondary cursor-pointer"
      >
        回到今天
      </button>
    </div>
    <QuickDiaryModal
      :show="showQuickModal"
      @close="showQuickModal = false"
      @created="handleDiaryCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import type { Diary, DiariesApiResponse } from '~/types/diary'
import {
  buildDailyActivityMap,
  buildHolidaySet,
  calculateMonthCoverage,
  resolveCountryCodeFromTimezone,
  toDateKeyInTimezone,
  type NagerHoliday
} from '~/lib/holiday-heatmap'

// Apply auth middleware
definePageMeta({
  middleware: 'auth'
})

// Get auth state and timezone
const { isAuthenticated, user } = useAuth()
const { getTimezone } = useTimezone()

// Quick diary modal state
const showQuickModal = ref(false)

const handleDiaryCreated = () => {
  fetchDiaries()
}

// Get date in user's timezone
const getDateInUserTimezone = (date?: Date): Date => {
  const inputDate = date || new Date()
  const userTimezone = getTimezone()

  // Create a date string in the user's timezone
  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: userTimezone,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  })

  // Format the date in user's timezone and parse it back
  const parts = dateFormatter.formatToParts(inputDate)
  const year = parseInt(parts.find(p => p.type === 'year')?.value || '0')
  const month = parseInt(parts.find(p => p.type === 'month')?.value || '0') - 1
  const day = parseInt(parts.find(p => p.type === 'day')?.value || '0')
  const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0')
  const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0')
  const second = parseInt(parts.find(p => p.type === 'second')?.value || '0')

  return new Date(year, month, day, hour, minute, second)
}

// 狀態 - Use user's timezone for initial date
const nowInTimezone = getDateInUserTimezone()
const currentYear = ref(nowInTimezone.getFullYear())
const currentMonth = ref(nowInTimezone.getMonth())
const diaries = ref<Diary[]>([])
const holidayDateSet = ref<Set<string>>(new Set())
const excludeHolidaysInStats = ref(true)
const loadingHolidays = ref(false)

// 星期名稱
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 當月天數
const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

// 當月第一天是星期幾
const firstDayOfWeek = computed(() => {
  const firstDay = getDateInUserTimezone(new Date(currentYear.value, currentMonth.value, 1))
  return firstDay.getDay()
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

// 獲取日記資料（獲取所有日記用於月曆顯示）
const fetchDiaries = async () => {
  try {
    // API returns paginated response: { data: [...], pagination: {...} }
    // Set a large limit to fetch all diaries for calendar display
    const response = await $fetch<DiariesApiResponse>('/api/diaries?limit=1000')
    diaries.value = response.data
  } catch (error) {
    // Handle 401 Unauthorized errors
    if (error && typeof error === 'object' && 'statusCode' in error && error.statusCode === 401) {
      const { user } = useAuth()
      user.value = null
      await navigateTo('/')
    }
    console.error('獲取日記失敗:', error)
  }
}

// 使用 computed 預先建立 Map，加速日期查詢
const diaryMap = computed(() => {
  const map = new Map<string, Diary>()
  diaries.value.forEach(diary => {
    const diaryDate = getDateInUserTimezone(new Date(diary.date || diary.createdAt))
    const key = `${diaryDate.getFullYear()}-${diaryDate.getMonth()}-${diaryDate.getDate()}`
    map.set(key, diary)
  })
  return map
})

const activeDayKeys = computed(() => {
  return buildDailyActivityMap(diaries.value, getTimezone())
})

// 檢查某天是否有日記（O(1)）
const hasDiary = (day: number): boolean => {
  const key = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return activeDayKeys.value.has(key)
}

// 獲取某天的日記標題（O(1)）
const getDiaryTitle = (day: number): string => {
  const key = `${currentYear.value}-${currentMonth.value}-${day}`
  return diaryMap.value.get(key)?.title || ''
}

// 檢查是否是今天
const isToday = (day: number): boolean => {
  const today = getDateInUserTimezone()
  return today.getDate() === day &&
         today.getMonth() === currentMonth.value &&
         today.getFullYear() === currentYear.value
}

const isExcludedHoliday = (day: number): boolean => {
  if (!excludeHolidaysInStats.value) return false
  const key = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  return holidayDateSet.value.has(key)
}

const heatmapDays = computed(() => {
  const totalDays = 371
  const end = getDateInUserTimezone()
  const rows: Array<Array<{ dateKey: string, level: 0 | 1, excluded: boolean } | null>> = []
  const days: Array<{ dateKey: string, level: 0 | 1, excluded: boolean }> = []

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(end)
    d.setDate(end.getDate() - i)
    const key = toDateKeyInTimezone(d, getTimezone())
    days.push({
      dateKey: key,
      level: activeDayKeys.value.has(key) ? 1 : 0,
      excluded: excludeHolidaysInStats.value && holidayDateSet.value.has(key)
    })
  }

  const startWeekday = new Date(days[0]!.dateKey).getDay()
  let cursor = 0

  for (let week = 0; week < 53; week++) {
    const row: Array<{ dateKey: string, level: 0 | 1, excluded: boolean } | null> = []
    for (let weekday = 0; weekday < 7; weekday++) {
      if (week === 0 && weekday < startWeekday) {
        row.push(null)
      } else {
        row.push(days[cursor] || null)
        cursor++
      }
    }
    rows.push(row)
  }
  return rows
})

const loadHolidays = async () => {
  if (!excludeHolidaysInStats.value) {
    holidayDateSet.value = new Set()
    return
  }

  const timezone = getTimezone()
  const countryCode = resolveCountryCodeFromTimezone(timezone)
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

// 上一個月
const previousMonth = () => {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

// 下一個月
const nextMonth = () => {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

// 回到今天
const goToToday = () => {
  const today = getDateInUserTimezone()
  currentYear.value = today.getFullYear()
  currentMonth.value = today.getMonth()
}

// 處理日期點擊（使用 Map 加速查詢）
const handleDateClick = (day: number) => {
  const dateStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const key = `${currentYear.value}-${currentMonth.value}-${day}`
  const diary = diaryMap.value.get(key)

  if (diary) {
    // 如果有日記，跳轉到詳情頁面
    navigateTo(`/diaries/${diary.id}`)
  } else {
    // 如果沒有日記，跳轉到新建頁面並帶入日期
    navigateTo(`/diaries/new?date=${dateStr}`)
  }
}

// 組件掛載時獲取資料（只在已認證時）
onMounted(() => {
  excludeHolidaysInStats.value = localStorage.getItem('exclude_holidays_in_stats') !== 'false'
  if (isAuthenticated.value) {
    fetchDiaries()
    loadHolidays()
  }
})

// 監聽認證狀態變化
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    fetchDiaries()
    loadHolidays()
  }
})

watch([currentYear, currentMonth], () => {
  loadHolidays()
})
</script>

<style scoped>
.calendar-page {
  max-width: 960px;
  margin: 0 auto;
}

.fin-card {
  border: 1px solid rgb(191 219 254);
  border-radius: 1rem;
  background: rgb(255 255 255 / 82%);
  backdrop-filter: blur(8px);
  padding: 1rem;
  box-shadow: 0 14px 28px rgb(30 64 175 / 8%);
}

.kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: rgb(59 130 246);
  font-weight: 600;
}

.nav-btn {
  min-width: 44px;
  min-height: 44px;
  border-radius: 0.75rem;
  border: 1px solid rgb(191 219 254);
  background: rgb(239 246 255);
  color: rgb(30 64 175);
  transition: background-color 200ms ease;
}

.nav-btn:hover {
  background: rgb(219 234 254);
}

.metric {
  border: 1px solid rgb(219 234 254);
  border-radius: 0.8rem;
  background: rgb(248 250 252 / 86%);
  padding: 0.7rem 0.85rem;
}

.metric-label {
  color: rgb(71 85 105);
  font-size: 0.76rem;
}

.metric-value {
  color: rgb(30 58 138);
  font-size: 1.15rem;
  font-weight: 700;
  margin-top: 0.2rem;
}

.metric-note {
  color: rgb(100 116 139);
  font-size: 0.72rem;
  margin-top: 0.15rem;
}

.day-card {
  height: 4.1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(226 232 240);
  background: white;
  padding: 0.5rem;
  text-align: left;
  position: relative;
  transition: all 180ms ease;
}

.day-card:hover {
  background: rgb(248 250 252);
  border-color: rgb(147 197 253);
}

.day-card-today {
  border-color: rgb(59 130 246);
  background: rgb(239 246 255);
}

.day-card-active {
  box-shadow: inset 0 0 0 1px rgb(59 130 246 / 45%);
}

.day-card-excluded {
  background-image: repeating-linear-gradient(
    -45deg,
    rgb(241 245 249),
    rgb(241 245 249) 5px,
    rgb(248 250 252) 5px,
    rgb(248 250 252) 10px
  );
}

.heatmap-wrap {
  display: grid;
  grid-template-columns: repeat(53, minmax(0, 1fr));
  gap: 0.22rem;
  overflow-x: auto;
}

.heatmap-week {
  display: grid;
  grid-template-rows: repeat(7, 0.65rem);
  gap: 0.22rem;
}

.heatmap-cell {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 0.14rem;
  border: 1px solid transparent;
}

.heatmap-cell-empty {
  opacity: 0;
}

.heatmap-cell-level-0 {
  background: rgb(226 232 240);
}

.heatmap-cell-level-1 {
  background: rgb(22 163 74);
}

.heatmap-cell-excluded {
  background: rgb(148 163 184);
}

.action {
  min-height: 44px;
  border-radius: 0.8rem;
  padding: 0.7rem 1rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  font-weight: 600;
  transition: all 180ms ease;
}

.action-primary {
  background: #1e40af;
  color: white;
}

.action-primary:hover {
  background: #1d4ed8;
}

.action-secondary {
  border: 1px solid rgb(191 219 254);
  color: rgb(30 64 175);
  background: rgb(239 246 255);
}

.action-secondary:hover {
  background: rgb(219 234 254);
}

@media (min-width: 640px) {
  .day-card {
    height: 6rem;
    padding: 0.65rem;
  }
}

:global(.dark .calendar-page), :global(.dark-mode .calendar-page) {
  color: rgb(226 232 240);
}

:global(.dark .fin-card) , :global(.dark-mode .fin-card)  {
  border-color: rgb(71 85 105);
  background: rgb(3 10 24 / 92%);
  box-shadow: 0 14px 28px rgb(2 6 23 / 45%);
}

:global(.dark .nav-btn) , :global(.dark-mode .nav-btn)  {
  border-color: rgb(51 65 85);
  background: rgb(12 19 35);
  color: rgb(125 211 252);
}

:global(.dark .nav-btn):hover , :global(.dark-mode .nav-btn):hover  {
  background: rgb(20 30 48);
}

:global(.dark .metric) , :global(.dark-mode .metric)  {
  border-color: rgb(71 85 105);
  background: rgb(8 15 30 / 84%);
}

:global(.dark .metric-label) , :global(.dark-mode .metric-label)  {
  color: rgb(148 163 184);
}

:global(.dark .metric-value) , :global(.dark-mode .metric-value)  {
  color: rgb(186 230 253);
}

:global(.dark .metric-note), :global(.dark-mode .metric-note) {
  color: rgb(148 163 184);
}

:global(.dark .day-card) , :global(.dark-mode .day-card)  {
  border-color: rgb(71 85 105);
  background: rgb(4 12 25 / 92%);
}

:global(.dark .day-card):hover , :global(.dark-mode .day-card):hover  {
  background: rgb(12 20 36);
  border-color: rgb(71 85 105);
}

:global(.dark .day-card-today) , :global(.dark-mode .day-card-today)  {
  border-color: rgb(30 64 175);
  background: rgb(30 64 175 / 22%);
}

:global(.dark .day-card-excluded), :global(.dark-mode .day-card-excluded) {
  background-image: repeating-linear-gradient(
    -45deg,
    rgb(30 41 59),
    rgb(30 41 59) 5px,
    rgb(15 23 42) 5px,
    rgb(15 23 42) 10px
  );
}

:global(.dark .action-secondary) , :global(.dark-mode .action-secondary)  {
  border-color: rgb(51 65 85);
  color: rgb(147 197 253);
  background: rgb(12 19 35);
}

:global(.dark .action-secondary):hover , :global(.dark-mode .action-secondary):hover  {
  background: rgb(20 30 48);
}

:global(.dark .action-primary), :global(.dark-mode .action-primary) {
  background: #1e3a8a;
  color: rgb(226 232 240);
}

:global(.dark .action-primary):hover, :global(.dark-mode .action-primary):hover {
  background: #1d4ed8;
}
</style>
