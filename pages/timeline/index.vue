<template>
  <div class="timeline-page">
    <div class="flex justify-between items-center mb-6">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">時間軸</h1>
      <NuxtLink
        to="/diaries/new"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
        新增日記
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4 mb-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label for="date-from" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            開始日期
          </label>
          <input
            type="date"
            id="date-from"
            v-model="filters.dateFrom"
            class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div>
          <label for="date-to" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            結束日期
          </label>
          <input
            type="date"
            id="date-to"
            v-model="filters.dateTo"
            class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="resetFilters"
            class="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <Icon name="heroicons:x-mark" class="mr-2 h-4 w-4" />
            清除篩選
          </button>
        </div>
      </div>
    </div>

    <div v-if="pending" class="text-center py-12">
      <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-indigo-600" />
      <p class="mt-2 text-gray-500">載入中...</p>
    </div>

    <div v-else-if="error" class="bg-red-50 p-4 rounded-md">
      <div class="flex">
        <div class="flex-shrink-0">
          <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-medium text-red-800">載入失敗</h3>
          <div class="mt-2 text-sm text-red-700">
            {{ error.message }}
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="groupedDiaries.length === 0" class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
      <Icon name="heroicons:clock" class="mx-auto h-12 w-12 text-gray-400" />
      <h3 class="mt-2 text-sm font-medium text-gray-900 dark:text-white">尚無日記</h3>
      <p class="mt-1 text-sm text-gray-500">開始記錄您的第一篇投資日記吧！</p>
      <div class="mt-6">
        <NuxtLink
          to="/diaries/new"
          class="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
          新增日記
        </NuxtLink>
      </div>
    </div>

    <!-- Timeline -->
    <div v-else class="relative">
      <!-- Vertical line -->
      <div class="absolute left-4 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-indigo-500 via-indigo-400 to-indigo-300"></div>

      <!-- Timeline items grouped by year/month -->
      <div v-for="group in groupedDiaries" :key="group.period" class="mb-8">
        <!-- Period header -->
        <div class="relative flex items-center mb-4 pl-10 sm:pl-20">
          <div class="absolute left-4 sm:left-8 w-4 h-4 bg-indigo-500 rounded-full border-4 border-white dark:border-gray-900 transform -translate-x-1/2"></div>
          <h2 class="text-lg sm:text-xl font-bold text-gray-800 dark:text-white">
            {{ group.periodLabel }}
          </h2>
          <span class="ml-3 text-sm text-gray-500 dark:text-gray-400">
            {{ group.diaries.length }} 篇日記
          </span>
        </div>

        <!-- Diaries in this period -->
        <div class="space-y-4 pl-10 sm:pl-20">
          <NuxtLink
            v-for="diary in group.diaries"
            :key="diary.id"
            :to="`/diaries/${diary.id}`"
            class="relative block group"
          >
            <!-- Timeline dot -->
            <div class="absolute left-0 sm:left-8 top-6 w-3 h-3 rounded-full border-2 border-white dark:border-gray-900 transform -translate-x-1/2 group-hover:scale-125 transition-all"
              :class="diary.alerts?.length ? 'bg-amber-400 group-hover:bg-amber-500' : 'bg-indigo-400 group-hover:bg-indigo-600'"></div>

            <!-- Card -->
            <div class="rounded-lg shadow hover:shadow-lg transition-shadow duration-200 overflow-hidden ml-6 sm:ml-12"
              :class="diary.alerts?.length ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-200 dark:ring-amber-700' : 'bg-white dark:bg-gray-800'">
              <!-- 提醒標籤 -->
              <div v-if="diary.alerts?.length" class="bg-amber-100 dark:bg-amber-800/50 px-4 py-2 border-b border-amber-200 dark:border-amber-700">
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:bell-alert" class="h-4 w-4 text-amber-600 dark:text-amber-300" />
                  <span class="text-xs font-medium text-amber-800 dark:text-amber-200">提醒事項</span>
                </div>
                <div class="mt-1 space-y-1">
                  <p v-for="(alert, idx) in diary.alerts.slice(0, 2)" :key="idx" class="text-xs text-amber-700 dark:text-amber-300 truncate">
                    • {{ alert.message }}
                  </p>
                  <p v-if="diary.alerts.length > 2" class="text-xs text-amber-600 dark:text-amber-400">
                    還有 {{ diary.alerts.length - 2 }} 個提醒...
                  </p>
                </div>
              </div>

              <div class="p-4 sm:p-6">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <h3 class="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {{ diary.title }}
                  </h3>
                  <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap flex items-center">
                    <Icon name="heroicons:calendar" class="mr-1 h-4 w-4" />
                    {{ formatDate(diary.date || diary.createdAt) }}
                  </span>
                </div>

                <p class="mt-2 text-gray-600 dark:text-gray-300 text-sm line-clamp-2">
                  {{ diary.content ? diary.content.replace(/[#*`]/g, '') : '無內容' }}
                </p>

                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <span v-if="diary.transactions?.length" class="flex items-center text-xs text-gray-500 dark:text-gray-400">
                    <Icon name="heroicons:currency-dollar" class="mr-1 h-4 w-4 text-green-500" />
                    {{ diary.transactions.length }} 筆交易
                  </span>
                  <span v-if="diary.alerts?.length" class="flex items-center text-xs text-amber-600 dark:text-amber-400">
                    <Icon name="heroicons:bell" class="mr-1 h-4 w-4" />
                    {{ diary.alerts.length }} 個提醒
                  </span>
                  <span class="text-indigo-600 dark:text-indigo-400 text-xs font-medium group-hover:text-indigo-500">
                    查看詳情 &rarr;
                  </span>
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

definePageMeta({
  middleware: 'auth'
})

// Type definitions
interface Diary {
  id: number
  title: string
  content: string
  date?: string
  createdAt: string
  transactions?: any[]
  alerts?: any[]
}

interface DiaryGroup {
  period: string
  periodLabel: string
  diaries: Diary[]
}

// Use lazy fetch with pagination to avoid loading all diaries at once
const page = ref(1)
const limit = 20
const diaries = ref<Diary[]>([])

const { pending, error } = await useLazyFetch<{ data: Diary[]; pagination: any }>(
  () => `/api/diaries?page=${page.value}&limit=${limit}`,
  {
    onResponse({ response }) {
      if (response._data?.data) {
        diaries.value.push(...response._data.data)
      }
    }
  }
)

const filters = reactive({
  dateFrom: '',
  dateTo: ''
})

// Reset filters
const resetFilters = () => {
  filters.dateFrom = ''
  filters.dateTo = ''
}

// Filter diaries by date range
const filteredDiaries = computed(() => {
  if (!diaries.value) return []

  let result = [...diaries.value]

  // Date from filter
  if (filters.dateFrom) {
    const fromDate = new Date(filters.dateFrom)
    fromDate.setHours(0, 0, 0, 0)
    result = result.filter(d => {
      const diaryDate = new Date(d.date || d.createdAt)
      return diaryDate >= fromDate
    })
  }

  // Date to filter
  if (filters.dateTo) {
    const toDate = new Date(filters.dateTo)
    toDate.setHours(23, 59, 59, 999)
    result = result.filter(d => {
      const diaryDate = new Date(d.date || d.createdAt)
      return diaryDate <= toDate
    })
  }

  // Sort by date descending
  return result.sort((a, b) => {
    const dateA = new Date(a.date || a.createdAt).getTime()
    const dateB = new Date(b.date || b.createdAt).getTime()
    return dateB - dateA
  })
})

// Group diaries by year and month
const groupedDiaries = computed((): DiaryGroup[] => {
  const groups = new Map<string, DiaryGroup>()

  filteredDiaries.value.forEach(diary => {
    const date = new Date(diary.date || diary.createdAt)
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const period = `${year}-${String(month).padStart(2, '0')}`
    const periodLabel = `${year}年 ${month}月`

    if (!groups.has(period)) {
      groups.set(period, {
        period,
        periodLabel,
        diaries: []
      })
    }

    groups.get(period)!.diaries.push(diary)
  })

  // Convert to array and sort by period descending
  return Array.from(groups.values()).sort((a, b) => b.period.localeCompare(a.period))
})

// Format date for display
const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  const weekday = weekdays[date.getDay()]

  return `${year}/${month}/${day} (${weekday})`
}

watch(error, (error) => {
  if (error) {
    console.error('Error fetching diaries:', error)
  }
})
</script>

<style scoped>
.timeline-page {
  max-width: 900px;
  margin: 0 auto;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
