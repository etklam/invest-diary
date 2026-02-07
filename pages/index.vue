<template>
  <div class="calendar-page">
    <!-- 月曆標題與導航 -->
    <div class="flex items-center justify-between mb-6">
      <button
        @click="previousMonth"
        class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Icon name="heroicons:chevron-left" class="w-6 h-6" />
      </button>
      <h1 class="text-2xl font-bold text-gray-800 dark:text-white">
        {{ currentYear }}年 {{ currentMonth + 1 }}月
      </h1>
      <button
        @click="nextMonth"
        class="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
      >
        <Icon name="heroicons:chevron-right" class="w-6 h-6" />
      </button>
    </div>

    <!-- 星期標題 -->
    <div class="grid grid-cols-7 gap-2 mb-2">
      <div
        v-for="day in weekDays"
        :key="day"
        class="text-center text-sm font-medium text-gray-500 dark:text-gray-400 py-2"
      >
        {{ day }}
      </div>
    </div>

    <!-- 月曆網格 -->
    <div class="grid grid-cols-7 gap-2">
      <!-- 空白格子（月初前的空白） -->
      <div
        v-for="n in firstDayOfWeek"
        :key="'blank-' + n"
        class="h-24"
      ></div>

      <!-- 日期格子 -->
      <div
        v-for="day in daysInMonth"
        :key="day"
        @click="handleDateClick(day)"
        class="h-24 p-2 rounded-lg border border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors relative"
        :class="{
          'bg-indigo-50 dark:bg-indigo-900/20': isToday(day),
          'border-indigo-500': isToday(day)
        }"
      >
        <div class="text-sm font-medium text-gray-700 dark:text-gray-300">
          {{ day }}
        </div>

        <!-- 日記標記 -->
        <div
          v-if="hasDiary(day)"
          class="absolute bottom-2 right-2"
        >
          <div class="w-3 h-3 bg-indigo-500 rounded-full"></div>
        </div>

        <!-- 日記標題預覽 -->
        <div
          v-if="hasDiary(day)"
          class="mt-2 text-xs text-gray-600 dark:text-gray-400 truncate"
        >
          {{ getDiaryTitle(day) }}
        </div>
      </div>
    </div>

    <!-- 今日按鈕 -->
    <div class="mt-6 flex justify-center">
      <button
        @click="goToToday"
        class="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        回到今天
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 類型定義
interface Diary {
  id: number
  title: string
  content: string
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

// 獲取日記資料
const fetchDiaries = async () => {
  try {
    const response = await $fetch<Diary[]>('/api/diaries')
    diaries.value = response
  } catch (error) {
    console.error('獲取日記失敗:', error)
  }
}

// 檢查某天是否有日記
const hasDiary = (day: number): boolean => {
  const dateStr = formatDate(day)
  return diaries.value.some(diary => {
    const diaryDate = new Date(diary.createdAt)
    return formatDate(diaryDate.getDate()) === dateStr &&
           diaryDate.getMonth() === currentMonth.value &&
           diaryDate.getFullYear() === currentYear.value
  })
}

// 獲取某天的日記標題
const getDiaryTitle = (day: number): string => {
  const dateStr = formatDate(day)
  const diary = diaries.value.find(diary => {
    const diaryDate = new Date(diary.createdAt)
    return formatDate(diaryDate.getDate()) === dateStr &&
           diaryDate.getMonth() === currentMonth.value &&
           diaryDate.getFullYear() === currentYear.value
  })
  return diary?.title || ''
}

// 格式化日期
const formatDate = (day: number): string => {
  return day.toString().padStart(2, '0')
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

// 處理日期點擊
const handleDateClick = (day: number) => {
  const dateStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  
  // 檢查該天是否有日記
  const diary = diaries.value.find(diary => {
    const diaryDate = new Date(diary.createdAt)
    return diaryDate.getDate() === day &&
           diaryDate.getMonth() === currentMonth.value &&
           diaryDate.getFullYear() === currentYear.value
  })

  if (diary) {
    // 如果有日記，跳轉到編輯頁面
    navigateTo(`/diaries/${diary.id}`)
  } else {
    // 如果沒有日記，跳轉到新建頁面
    navigateTo(`/diaries/new?date=${dateStr}`)
  }
}

// 組件掛載時獲取資料
onMounted(() => {
  fetchDiaries()
})
</script>

<style scoped>
.calendar-page {
  max-width: 800px;
  margin: 0 auto;
}
</style>
