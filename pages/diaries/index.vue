<template>
  <div class="space-y-6">
    <div class="flex justify-between items-center">
      <h1 class="text-2xl font-bold text-gray-900 dark:text-white">日記列表</h1>
      <NuxtLink
        to="/diaries/new"
        class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
      >
        <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
        新增日記
      </NuxtLink>
    </div>

    <!-- Filters and Sorting -->
    <div class="bg-white dark:bg-gray-800 shadow sm:rounded-lg p-4">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div class="sm:col-span-4">
          <label for="search" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            搜尋日記
          </label>
          <div class="mt-1 relative rounded-md shadow-sm">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="text"
              id="search"
              v-model="filters.search"
              placeholder="搜尋標題或內容..."
              class="focus:ring-indigo-500 focus:border-indigo-500 block w-full pl-10 sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
          </div>
        </div>
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
        <div>
          <label for="sort-by" class="block text-sm font-medium text-gray-700 dark:text-gray-300">
            排序方式
          </label>
          <select
            id="sort-by"
            v-model="filters.sortBy"
            class="mt-1 shadow-sm focus:ring-indigo-500 focus:border-indigo-500 block w-full sm:text-sm border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          >
            <option value="date-desc">日期（新到舊）</option>
            <option value="date-asc">日期（舊到新）</option>
            <option value="title-asc">標題（A-Z）</option>
            <option value="title-desc">標題（Z-A）</option>
          </select>
        </div>
      </div>
      <div class="mt-3 flex justify-between items-center">
        <span v-if="filters.search" class="text-sm text-gray-500 dark:text-gray-400">
          找到 {{ filteredAndSortedDiaries.length }} 筆結果
        </span>
        <button
          @click="resetFilters"
          class="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-sm leading-4 font-medium rounded-md text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
        >
          <Icon name="heroicons:x-mark" class="mr-2 h-4 w-4" />
          清除篩選
        </button>
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

    <div v-else-if="diaries.length === 0" class="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
      <Icon name="heroicons:document-text" class="mx-auto h-12 w-12 text-gray-400" />
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

    <div v-else class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="diary in filteredAndSortedDiaries"
        :key="diary.id"
        :to="`/diaries/${diary.id}`"
        class="block bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-md transition-shadow duration-200 overflow-hidden"
      >
        <div class="p-6">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-semibold text-gray-900 dark:text-white truncate">
              {{ diary.title }}
            </h2>
            <span class="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap ml-2">
              {{ new Date(diary.date || diary.createdAt).toLocaleDateString() }}
            </span>
          </div>
          <p class="mt-2 text-gray-600 dark:text-gray-300 line-clamp-3 text-sm">
            {{ diary.content.replace(/[#*`]/g, '') }}
          </p>
          <div class="mt-4 flex items-center justify-between">
            <div class="flex items-center space-x-2 text-xs text-gray-500">
              <span v-if="diary.transactions?.length" class="flex items-center">
                <Icon name="heroicons:currency-dollar" class="mr-1 h-4 w-4" />
                {{ diary.transactions.length }} 筆交易
              </span>
              <span v-if="diary.alerts?.length" class="flex items-center">
                <Icon name="heroicons:bell" class="mr-1 h-4 w-4" />
                {{ diary.alerts.length }} 個提醒
              </span>
            </div>
            <span class="text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:text-indigo-500">
              閱讀更多 &rarr;
            </span>
          </div>
        </div>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

// Use lazy fetch to avoid calling API during SSR before auth check
const { data: diaries, pending, error, refresh } = await useLazyFetch('/api/diaries')

const filters = reactive({
  search: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date-desc'
})

// Reset filters
const resetFilters = () => {
  filters.search = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.sortBy = 'date-desc'
}

// Filter diaries by search and date range
const filteredDiaries = computed(() => {
  if (!diaries.value) return []

  let result = [...diaries.value]

  // Search filter
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    result = result.filter(d =>
      d.title.toLowerCase().includes(searchLower) ||
      (d.content && d.content.toLowerCase().includes(searchLower))
    )
  }

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

  return result
})

// Sort diaries
const filteredAndSortedDiaries = computed(() => {
  const result = [...filteredDiaries.value]

  switch (filters.sortBy) {
    case 'date-desc':
      return result.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime()
        const dateB = new Date(b.date || b.createdAt).getTime()
        return dateB - dateA
      })
    case 'date-asc':
      return result.sort((a, b) => {
        const dateA = new Date(a.date || a.createdAt).getTime()
        const dateB = new Date(b.date || b.createdAt).getTime()
        return dateA - dateB
      })
    case 'title-asc':
      return result.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'))
    case 'title-desc':
      return result.sort((a, b) => b.title.localeCompare(a.title, 'zh-TW'))
    default:
      return result
  }
})

watch(error, (error) => {
  if (error) {
    console.error('Error fetching diaries:', error)
  }
})
</script>
