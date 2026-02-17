<template>
  <div class="calendar-page">
    <!-- 月曆標題與導航 -->
    <div class="flex items-center justify-between mb-6">
      <button
        @click="previousMonth"
        class="p-2 sm:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="上一個月"
      >
        <Icon name="heroicons:chevron-left" class="w-6 h-6" />
      </button>
      <h1 class="text-xl sm:text-2xl font-bold text-gray-800 dark:text-white">
        {{ currentYear }}年 {{ currentMonth + 1 }}月
      </h1>
      <button
        @click="nextMonth"
        class="p-2 sm:p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
        aria-label="下一個月"
      >
        <Icon name="heroicons:chevron-right" class="w-6 h-6" />
      </button>
    </div>

    <!-- 星期標題 -->
    <div class="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
      <div
        v-for="day in weekDays"
        :key="day"
        class="text-center text-xs sm:text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
      >
        {{ day }}
      </div>
    </div>

    <!-- 月曆網格 -->
    <div class="grid grid-cols-7 gap-1 sm:gap-2">
      <!-- 空白格子（月初前的空白） -->
      <div
        v-for="n in firstDayOfWeek"
        :key="'blank-' + n"
        class="h-16 sm:h-24"
      ></div>

      <!-- 日期格子 -->
      <div
        v-for="day in daysInMonth"
        :key="day"
        @click="handleDateClick(day)"
        class="h-16 sm:h-24 p-1 sm:p-2 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors relative"
        :class="{
          'bg-indigo-50 dark:bg-indigo-900/40': isToday(day),
          'border-indigo-500': isToday(day)
        }"
      >
        <div class="text-sm sm:text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ day }}
        </div>

        <!-- 日記標記 -->
        <div
          v-if="hasDiary(day)"
          class="absolute bottom-1 sm:bottom-2 right-1 sm:right-2"
        >
          <div class="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-indigo-500 rounded-full"></div>
        </div>

        <!-- 日記標題預覽 -->
        <div
          v-if="hasDiary(day)"
          class="mt-1 sm:mt-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate leading-tight"
        >
          {{ getDiaryTitle(day) }}
        </div>
      </div>
    </div>

    <!-- 今日按鈕 -->
    <div class="mt-6 flex justify-center">
      <button
        @click="goToToday"
        class="px-4 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors min-h-[44px] font-medium"
      >
        回到今天
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// Apply auth middleware
definePageMeta({
  middleware: 'auth'
})

// Get auth state
const { isAuthenticated } = useAuth()

// 類型定義
interface Diary {
  id: number
  title: string
  content: string
  date?: string
  createdAt: string
}

// 狀態
const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const diaries = ref<Diary[]>([])

// 星期名稱
const weekDays = ['日', '一', '二', '三', '四', '五', '六']

// 當月天數
const daysInMonth = computed(() => {
  return new Date(currentYear.value, currentMonth.value + 1, 0).getDate()
})

// 當月第一天是星期幾
const firstDayOfWeek = computed(() => {
  return new Date(currentYear.value, currentMonth.value, 1).getDay()
})

// 獲取日記資料（獲取所有日記用於月曆顯示）
const fetchDiaries = async () => {
  try {
    // API returns paginated response: { data: [...], pagination: {...} }
    // Set a large limit to fetch all diaries for calendar display
    const response = await $fetch<{ data: Diary[], pagination: any }>('/api/diaries?limit=1000')
    diaries.value = response.data
  } catch (error: any) {
    // Handle 401 Unauthorized errors
    if (error?.statusCode === 401) {
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
    const diaryDate = new Date(diary.date || diary.createdAt)
    const key = `${diaryDate.getFullYear()}-${diaryDate.getMonth()}-${diaryDate.getDate()}`
    map.set(key, diary)
  })
  return map
})

// 檢查某天是否有日記（O(1)）
const hasDiary = (day: number): boolean => {
  const key = `${currentYear.value}-${currentMonth.value}-${day}`
  return diaryMap.value.has(key)
}

// 獲取某天的日記標題（O(1)）
const getDiaryTitle = (day: number): string => {
  const key = `${currentYear.value}-${currentMonth.value}-${day}`
  return diaryMap.value.get(key)?.title || ''
}

// 檢查是否是今天
const isToday = (day: number): boolean => {
  const today = new Date()
  return today.getDate() === day &&
         today.getMonth() === currentMonth.value &&
         today.getFullYear() === currentYear.value
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
  const today = new Date()
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
  if (isAuthenticated.value) {
    fetchDiaries()
  }
})

// 監聽認證狀態變化
watch(isAuthenticated, (authenticated) => {
  if (authenticated) {
    fetchDiaries()
  }
})
</script>

<style scoped>
.calendar-page {
  max-width: 800px;
  margin: 0 auto;
}
</style>
