<template>
  <div class="max-w-content mx-auto pb-24">
    <!-- Header Section -->
    <header class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <h1 class="text-3xl font-semibold tracking-tight text-copy">
          {{ t('diary.title', '日記工作台') }}
        </h1>
        <p class="text-copy-secondary text-sm">
          {{ t('diary.hero.summary', '先看節奏，再做紀錄。提醒、交易、最新複盤都放在第一視線。') }}
        </p>
      </div>
      
      <div class="flex items-center gap-3">
        <BaseButton variant="secondary" @click="showQuickModal = true">
          <Icon name="lucide:zap" class="mr-2 h-4 w-4" />
          {{ t('diary.quickDiary', '快速日記') }}
        </BaseButton>
        <BaseButton variant="primary" @click="navigateTo('/diaries/new')">
          <Icon name="lucide:plus" class="mr-2 h-4 w-4" />
          {{ t('diary.newDiary', '新增日記') }}
        </BaseButton>
      </div>
    </header>

    <!-- Snapshot Stats -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-12">
      <BaseCard class="flex flex-col gap-1">
        <span class="text-[10px] font-semibold text-copy-muted uppercase tracking-widest">總日記數</span>
        <span class="text-2xl font-semibold text-copy tabular-nums">{{ diaryItems.length }}</span>
      </BaseCard>
      <BaseCard class="flex flex-col gap-1">
        <span class="text-[10px] font-semibold text-copy-muted uppercase tracking-widest">近 7 天紀錄</span>
        <span class="text-2xl font-semibold text-copy tabular-nums">{{ diariesThisWeek }}</span>
      </BaseCard>
      <BaseCard class="flex flex-col gap-1">
        <span class="text-[10px] font-semibold text-copy-muted uppercase tracking-widest">目前篩選結果</span>
        <span class="text-2xl font-semibold text-copy tabular-nums">{{ filteredAndSortedDiaries.length }}</span>
      </BaseCard>
    </div>

    <!-- Quick Diary Modal -->
    <QuickDiaryModal
      :show="showQuickModal"
      @close="showQuickModal = false"
      @created="handleDiaryCreated"
    />

    <!-- Filters Section -->
    <div class="mb-12 p-6 bg-surface-alt border border-line">
      <div class="flex flex-col gap-6">
        <div class="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div class="md:col-span-2">
            <BaseInput
              v-model="filters.search"
              type="text"
              :label="t('diary.searchLabel', '搜尋日記')"
              placeholder="搜尋標題或內容..."
            />
          </div>
          <BaseInput
            v-model="filters.dateFrom"
            type="date"
            :label="t('diary.dateFrom')"
          />
          <BaseInput
            v-model="filters.dateTo"
            type="date"
            :label="t('diary.dateTo')"
          />
        </div>
        <div class="flex items-center justify-between">
          <p class="text-xs text-copy-muted font-medium uppercase tracking-tighter">{{ filterSummary }}</p>
          <BaseButton 
            v-if="hasActiveFilters" 
            variant="ghost" 
            size="sm" 
            @click="resetFilters"
            class="text-semantic-error"
          >
            <Icon name="lucide:x" class="mr-2 h-4 w-4" />
            {{ t('diary.clearFilters') }}
          </BaseButton>
        </div>
      </div>
    </div>

    <!-- Loading Skeleton -->
    <div v-if="pending" class="space-y-4">
      <div v-for="i in 4" :key="i" class="border border-line bg-surface p-4">
        <div class="flex items-start gap-4">
          <BaseSkeleton variant="text" class="w-20 h-5" />
          <div class="flex-1 space-y-2">
            <BaseSkeleton variant="text" class="w-3/4" />
            <BaseSkeleton variant="text" class="w-1/2" />
          </div>
        </div>
      </div>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="mb-12">
      <BaseAlert variant="error">
        <h3 class="font-semibold">載入失敗</h3>
        <p class="mt-1 opacity-90">{{ error.message }}</p>
      </BaseAlert>
    </div>

    <!-- Empty State -->
    <div v-else-if="diaryItems.length === 0" class="py-24 text-center">
      <div class="mb-6 flex justify-center">
        <Icon name="lucide:file-text" class="h-12 w-12 text-copy-muted opacity-20" />
      </div>
      <h3 class="text-xl font-semibold text-copy">尚無日記</h3>
      <p class="mt-2 text-copy-secondary max-w-xs mx-auto text-sm">先記下第一篇投資日記，之後提醒、交易和複盤節奏才有地方可落。</p>
      <div class="mt-8">
        <BaseButton variant="primary" @click="navigateTo('/diaries/new')">
          新增日記
        </BaseButton>
      </div>
    </div>

    <!-- Entries List -->
    <div v-else class="space-y-4">
      <div class="flex items-center justify-between mb-6">
        <h2 class="text-sm font-semibold text-copy uppercase tracking-widest">
          {{ t('diary.entriesTitle', '日記列表') }}
        </h2>
      </div>

      <NuxtLink
        v-for="diary in filteredAndSortedDiaries"
        :key="diary.id"
        :to="`/diaries/${diary.id}`"
        class="block group"
      >
        <BaseCard clickable class="group-hover:border-accent/30">
          <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
            <div class="space-y-2 flex-1">
              <div class="flex items-center gap-3">
                <time class="text-[10px] font-semibold text-accent uppercase tracking-widest">
                  {{ formatDiaryDate(diary.date || diary.createdAt) }}
                </time>
                <div v-if="diary.alerts?.length" class="w-1 h-1 bg-semantic-warning rounded-full"></div>
                <div v-if="diary.transactions?.length" class="w-1 h-1 bg-semantic-success rounded-full"></div>
              </div>
              <h3 class="text-lg font-semibold text-copy group-hover:text-accent transition-colors">
                {{ diary.title || '未命名紀錄' }}
              </h3>
              <p class="text-copy-secondary text-sm line-clamp-2 leading-relaxed max-w-2xl">
                {{ getDiaryExcerpt(diary) }}
              </p>
            </div>

            <div class="flex flex-wrap sm:flex-col items-end gap-2 shrink-0">
              <BaseBadge v-if="diary.transactions?.length" variant="success">
                {{ diary.transactions.length }} 筆交易
              </BaseBadge>
              <BaseBadge v-if="diary.alerts?.length" variant="warning">
                {{ diary.alerts.length }} 個提醒
              </BaseBadge>
              <div class="mt-auto pt-2 flex items-center gap-2 text-[10px] font-bold text-copy-muted uppercase group-hover:text-accent transition-colors">
                打開條目
                <Icon name="lucide:chevron-right" class="h-3 w-3" />
              </div>
            </div>
          </div>
        </BaseCard>
      </NuxtLink>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatYmdInTimezone } from '~/lib/diary-date'

definePageMeta({
  middleware: 'auth'
})
const { t } = useI18n()
const { formatLocaleDate, getTimezone } = useTimezone()

// Quick diary modal state
const showQuickModal = ref(false)

const handleDiaryCreated = () => {
  refresh()
}

// API returns { data, pagination }
const { data: diaries, pending, error, refresh } = await useLazyFetch('/api/diaries', {
  transform: (res: any) => res?.data ?? []
})

const filters = reactive({
  search: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date-desc'
})

const diaryItems = computed<any[]>(() => diaries.value ?? [])

const diariesThisWeek = computed(() => {
  const now = Date.now()
  const sevenDays = 7 * 24 * 60 * 60 * 1000
  return diaryItems.value.filter((diary) => {
    const diaryTime = new Date(diary.date || diary.createdAt).getTime()
    return Number.isFinite(diaryTime) && now - diaryTime <= sevenDays
  }).length
})

const hasActiveFilters = computed(() =>
  Boolean(filters.search || filters.dateFrom || filters.dateTo || filters.sortBy !== 'date-desc')
)

const filterSummary = computed(() => {
  if (pending.value) return '正在讀取條目...'
  if (!diaryItems.value.length) return '還沒有資料可供篩選。'
  if (hasActiveFilters.value) return `目前保留 ${filteredAndSortedDiaries.value.length} 篇條目。`
  return `共 ${diaryItems.value.length} 篇日記`
})

const resetFilters = () => {
  filters.search = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.sortBy = 'date-desc'
}

const filteredDiaries = computed(() => {
  if (!diaries.value) return []
  let result = [...diaries.value]
  if (filters.search) {
    const searchLower = filters.search.toLowerCase()
    result = result.filter(d =>
      d.title.toLowerCase().includes(searchLower) ||
      (d.content && d.content.toLowerCase().includes(searchLower))
    )
  }
  if (filters.dateFrom) {
    result = result.filter(d => formatYmdInTimezone(d.date || d.createdAt, getTimezone()) >= filters.dateFrom)
  }
  if (filters.dateTo) {
    result = result.filter(d => formatYmdInTimezone(d.date || d.createdAt, getTimezone()) <= filters.dateTo)
  }
  return result
})

const filteredAndSortedDiaries = computed(() => {
  const result = [...filteredDiaries.value]
  switch (filters.sortBy) {
    case 'date-desc': return result.sort((a, b) => new Date(b.date || b.createdAt).getTime() - new Date(a.date || a.createdAt).getTime())
    case 'date-asc': return result.sort((a, b) => new Date(a.date || a.createdAt).getTime() - new Date(b.date || b.createdAt).getTime())
    case 'title-asc': return result.sort((a, b) => a.title.localeCompare(b.title, 'zh-TW'))
    case 'title-desc': return result.sort((a, b) => b.title.localeCompare(a.title, 'zh-TW'))
    default: return result
  }
})

const formatDiaryDate = (date: string | Date) => formatLocaleDate(date, { year: 'numeric', month: '2-digit', day: '2-digit' })

const getDiaryExcerpt = (diary: { content?: string }) => {
  const plainText = (diary.content || '').replace(/[#*`>\-\n]/g, ' ').replace(/\s+/g, ' ').trim()
  return plainText || '這篇條目還沒有摘要內容，打開把判斷補完整。'
}
</script>

<style scoped>
.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
