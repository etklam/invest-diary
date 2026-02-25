<template>
  <div class="diary-page space-y-6">
    <div class="panel flex flex-wrap justify-between items-center gap-3">
      <div>
        <p class="kicker">Diary Ledger</p>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">日記列表</h1>
      </div>
      <div class="flex gap-2">
        <button
          @click="showQuickModal = true"
          class="action-btn-success cursor-pointer"
        >
          <Icon name="heroicons:bolt" class="mr-2 h-5 w-5" />
          快速日記
        </button>
        <NuxtLink
          to="/diaries/new"
          class="action-btn cursor-pointer"
        >
          <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
          新增日記
        </NuxtLink>
      </div>
    </div>

    <!-- Quick Diary Modal -->
    <QuickDiaryModal
      :show="showQuickModal"
      @close="showQuickModal = false"
      @created="handleDiaryCreated"
    />

    <!-- Filters and Sorting -->
    <div class="panel">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div class="sm:col-span-4">
          <label for="search" class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            搜尋日記
          </label>
          <div class="mt-1 relative rounded-xl">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-slate-400" />
            </div>
            <input
              type="text"
              id="search"
              v-model="filters.search"
              placeholder="搜尋標題或內容..."
              class="field pl-10"
            />
          </div>
        </div>
        <div>
          <label for="date-from" class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            開始日期
          </label>
          <input
            type="date"
            id="date-from"
            v-model="filters.dateFrom"
            class="field"
          />
        </div>
        <div>
          <label for="date-to" class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            結束日期
          </label>
          <input
            type="date"
            id="date-to"
            v-model="filters.dateTo"
            class="field"
          />
        </div>
        <div>
          <label for="sort-by" class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            排序方式
          </label>
          <select
            id="sort-by"
            v-model="filters.sortBy"
            class="field"
          >
            <option value="date-desc">日期（新到舊）</option>
            <option value="date-asc">日期（舊到新）</option>
            <option value="title-asc">標題（A-Z）</option>
            <option value="title-desc">標題（Z-A）</option>
          </select>
        </div>
      </div>
      <div class="mt-3 flex justify-between items-center">
        <span v-if="filters.search" class="text-sm text-slate-500 dark:text-slate-400">
          找到 {{ filteredAndSortedDiaries.length }} 筆結果
        </span>
        <button
          @click="resetFilters"
          class="action-btn-muted cursor-pointer"
        >
          <Icon name="heroicons:x-mark" class="mr-2 h-4 w-4" />
          清除篩選
        </button>
      </div>
    </div>

    <div v-if="pending" class="panel text-center py-12">
      <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-blue-700" />
      <p class="mt-2 text-slate-500">載入中...</p>
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/80 dark:bg-red-950/30">
      <div class="flex">
        <div class="flex-shrink-0">
          <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-semibold text-red-800 dark:text-red-200">載入失敗</h3>
          <div class="mt-2 text-sm text-red-700 dark:text-red-200/90">
            {{ error.message }}
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="diaries.length === 0" class="panel text-center py-12">
      <Icon name="heroicons:document-text" class="mx-auto h-12 w-12 text-slate-400" />
      <h3 class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">尚無日記</h3>
      <p class="mt-1 text-sm text-slate-500">開始記錄您的第一篇投資日記吧！</p>
      <div class="mt-6">
        <NuxtLink
          to="/diaries/new"
          class="action-btn cursor-pointer"
        >
          <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
          新增日記
        </NuxtLink>
      </div>
    </div>

    <div v-else class="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      <NuxtLink
        v-for="diary in filteredAndSortedDiaries"
        :key="diary.id"
        :to="`/diaries/${diary.id}`"
        class="card group block cursor-pointer"
      >
        <div class="p-6">
          <div class="flex justify-between items-start">
            <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-200 truncate group-hover:text-blue-700 dark:group-hover:text-sky-300 transition-colors">
              {{ diary.title }}
            </h2>
            <span class="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap ml-2">
              {{ new Date(diary.date || diary.createdAt).toLocaleDateString() }}
            </span>
          </div>
          <p class="mt-2 text-slate-600 dark:text-slate-300 line-clamp-3 text-sm">
            {{ diary.content.replace(/[#*`]/g, '') }}
          </p>
          <div class="mt-4 flex items-center justify-between">
            <div class="flex items-center space-x-2 text-xs text-slate-500">
              <span v-if="diary.transactions?.length" class="flex items-center">
                <Icon name="heroicons:currency-dollar" class="mr-1 h-4 w-4" />
                {{ diary.transactions.length }} 筆交易
              </span>
              <span v-if="diary.alerts?.length" class="flex items-center">
                <Icon name="heroicons:bell" class="mr-1 h-4 w-4" />
                {{ diary.alerts.length }} 個提醒
              </span>
            </div>
            <span class="text-blue-700 dark:text-sky-300 text-sm font-semibold">
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

// Quick diary modal state
const showQuickModal = ref(false)

const handleDiaryCreated = () => {
  refresh()
}

// Use lazy fetch to avoid calling API during SSR before auth check
// API returns { data, pagination }, so transform to diary array
const { data: diaries, pending, error, refresh } = await useLazyFetch('/api/diaries', {
  transform: (res: any) => res?.data ?? []
})

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

<style scoped>
.diary-page {
  max-width: 1080px;
  margin: 0 auto;
}

.panel {
  border: 1px solid rgb(191 219 254);
  border-radius: 0.95rem;
  background: rgb(255 255 255 / 84%);
  backdrop-filter: blur(8px);
  padding: 1rem;
  box-shadow: 0 12px 26px rgb(30 64 175 / 8%);
}

.kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgb(59 130 246);
  font-weight: 700;
}

.field {
  margin-top: 0.35rem;
  display: block;
  width: 100%;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.7rem;
  background: rgb(248 250 252);
  color: rgb(15 23 42);
  font-size: 0.9rem;
  padding: 0.55rem 0.65rem;
}

.field:focus-visible {
  outline: none;
  border-color: rgb(59 130 246);
  box-shadow: 0 0 0 3px rgb(147 197 253 / 55%);
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.58rem 1rem;
  border-radius: 0.75rem;
  color: white;
  background: #1e40af;
  transition: background-color 180ms ease;
}

.action-btn:hover {
  background: #1d4ed8;
}

.action-btn-success {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.58rem 1rem;
  border-radius: 0.75rem;
  color: white;
  background: #059669;
  transition: background-color 180ms ease;
}

.action-btn-success:hover {
  background: #047857;
}

.action-btn-muted {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.7rem;
  padding: 0.55rem 0.8rem;
  color: rgb(30 58 138);
  background: rgb(239 246 255);
  transition: background-color 180ms ease;
}

.action-btn-muted:hover {
  background: rgb(219 234 254);
}

.card {
  border: 1px solid rgb(191 219 254);
  border-radius: 0.95rem;
  background: rgb(255 255 255 / 90%);
  box-shadow: 0 8px 22px rgb(30 64 175 / 8%);
  transition: all 180ms ease;
}

.card:hover {
  border-color: rgb(96 165 250);
  box-shadow: 0 14px 28px rgb(30 64 175 / 14%);
  transform: translateY(-2px);
}

:global(.dark .panel) , :global(.dark-mode .panel)  {
  border-color: rgb(71 85 105);
  background: rgb(3 10 24 / 92%);
  box-shadow: 0 12px 26px rgb(2 6 23 / 45%);
}

:global(.dark .field) , :global(.dark-mode .field)  {
  border-color: rgb(100 116 139);
  background: rgb(12 19 35);
  color: rgb(226 232 240);
}

:global(.dark .field):focus-visible , :global(.dark-mode .field):focus-visible  {
  border-color: rgb(56 189 248);
}

:global(.dark .action-btn-muted) , :global(.dark-mode .action-btn-muted)  {
  border-color: rgb(100 116 139);
  color: rgb(186 230 253);
  background: rgb(12 19 35);
}

:global(.dark .action-btn-muted):hover , :global(.dark-mode .action-btn-muted):hover  {
  background: rgb(20 30 48);
}

:global(.dark .card) , :global(.dark-mode .card)  {
  border-color: rgb(71 85 105);
  background: rgb(3 10 24 / 94%);
  box-shadow: 0 8px 22px rgb(2 6 23 / 45%);
}

:global(.dark .card):hover , :global(.dark-mode .card):hover  {
  border-color: rgb(56 189 248);
}

:global(.dark .action-btn), :global(.dark-mode .action-btn) {
  background: #1e3a8a;
  color: rgb(226 232 240);
}

:global(.dark .action-btn):hover, :global(.dark-mode .action-btn):hover {
  background: #1d4ed8;
}

:global(.dark .action-btn-success), :global(.dark-mode .action-btn-success) {
  background: #065f46;
  color: rgb(226 232 240);
}

:global(.dark .action-btn-success):hover, :global(.dark-mode .action-btn-success):hover {
  background: #047857;
}
</style>
