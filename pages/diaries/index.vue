<template>
  <div class="diary-page mx-auto max-w-[1280px] space-y-6">
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
          {{ $t('desk.list.label') }}
        </p>
        <h1 class="font-display mt-1 text-3xl tracking-tight text-dt-text">
          {{ $t('nav.diaries') }}
        </h1>
        <p class="mt-2 text-sm text-dt-text-muted">
          {{ $t('desk.libraryDescription') }}
        </p>
      </div>
      <div class="flex flex-wrap gap-3">
        <BaseButton variant="primary" @click="openQuickDiary">
          <Icon name="heroicons:pencil-square" class="h-5 w-5" />
          {{ $t('desk.actions.quickDiary') }}
        </BaseButton>
        <NuxtLink to="/diaries/new" class="inline-flex">
          <BaseButton variant="secondary">
            <Icon name="heroicons:plus" class="h-5 w-5" />
            {{ $t('desk.actions.newDiary') }}
          </BaseButton>
        </NuxtLink>
      </div>
    </header>

    <!-- Filters -->
    <LedgerCard class="order-5 md:order-none">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
              {{ $t('desk.filter.label') }}
            </p>
            <h2 class="font-display mt-1 text-2xl tracking-tight text-dt-text">
              {{ $t('desk.filter.title') }}
            </h2>
          </div>
          <BaseButton
            variant="ghost"
            :disabled="!hasActiveFilters"
            @click="resetFilters"
          >
            <Icon name="heroicons:x-mark" class="h-4 w-4" />
            {{ $t('desk.filter.clear') }}
          </BaseButton>
        </div>

      <div class="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-4">
        <div class="sm:col-span-4">
          <label for="search" class="field-label text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('desk.filter.searchLabel') }}
          </label>
          <div class="relative mt-1.5">
            <div class="pointer-events-none absolute inset-y-0 left-4 flex items-center">
              <Icon name="heroicons:magnifying-glass" class="h-5 w-5 text-dt-text-soft" />
            </div>
            <input
              id="search"
              v-model="searchInput"
              type="text"
              :placeholder="$t('desk.filter.searchPlaceholder')"
              class="field block w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-3 pl-11 text-sm text-dt-text focus:border-dt-secondary focus:outline-none focus:ring-2 focus:ring-dt-secondary/20"
            />
          </div>
        </div>
        <div>
          <label for="date-from" class="field-label text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('desk.filter.dateFrom') }}
          </label>
          <input
            id="date-from"
            v-model="filters.dateFrom"
            type="date"
            class="field mt-1.5 block w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-3 text-sm text-dt-text focus:border-dt-secondary focus:outline-none focus:ring-2 focus:ring-dt-secondary/20"
          />
        </div>
        <div>
          <label for="date-to" class="field-label text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('desk.filter.dateTo') }}
          </label>
          <input
            id="date-to"
            v-model="filters.dateTo"
            type="date"
            class="field mt-1.5 block w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-3 text-sm text-dt-text focus:border-dt-secondary focus:outline-none focus:ring-2 focus:ring-dt-secondary/20"
          />
        </div>
        <div>
          <label for="sort-by" class="field-label text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('desk.filter.sortBy') }}
          </label>
          <select
            id="sort-by"
            v-model="filters.sortBy"
            class="field mt-1.5 block w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-3 text-sm text-dt-text focus:border-dt-secondary focus:outline-none focus:ring-2 focus:ring-dt-secondary/20"
          >
            <option value="date-desc">{{ $t('desk.filter.sortDateDesc') }}</option>
            <option value="date-asc">{{ $t('desk.filter.sortDateAsc') }}</option>
            <option value="title-asc">{{ $t('desk.filter.sortTitleAsc') }}</option>
            <option value="title-desc">{{ $t('desk.filter.sortTitleDesc') }}</option>
          </select>
        </div>
      </div>

      <p class="mt-4 text-sm text-dt-text-muted">{{ filterSummary }}</p>
    </LedgerCard>

    <!-- Loading state -->
    <section v-if="pending && diaryItems.length === 0" class="state-panel flex min-h-[220px] flex-wrap items-center justify-center gap-4 rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <AppSkeleton variant="card" :count="3" />
    </section>

    <!-- Error state -->
    <section v-else-if="error && diaryItems.length === 0" class="state-panel flex min-h-[220px] flex-wrap items-center justify-center gap-4 rounded-dt-md border border-dt-danger/30 bg-dt-surface p-5 text-dt-danger shadow-dt-md">
      <Icon name="heroicons:x-circle" class="h-5 w-5" />
      <div class="text-center">
        <h3 class="font-display text-xl tracking-tight text-dt-text">{{ $t('desk.error.title') }}</h3>
        <p class="mt-1 text-sm text-dt-text-muted">{{ error.message }}</p>
      </div>
      <BaseButton variant="secondary" @click="refreshAll()">
        <Icon name="heroicons:arrow-path" class="h-4 w-4" />
        {{ $t('common.retry') }}
      </BaseButton>
    </section>

    <!-- Empty state -->
    <section v-else-if="diaryItems.length === 0 && !hasActiveFilters" class="state-panel flex min-h-[220px] flex-wrap items-center justify-center gap-4 rounded-dt-md border border-dt-border bg-dt-surface p-5 text-center shadow-dt-md">
      <Icon name="heroicons:document-text" class="h-10 w-10 text-dt-text-soft" />
      <div>
        <h3 class="font-display text-xl tracking-tight text-dt-text">{{ $t('desk.empty.title') }}</h3>
        <p class="mt-1 text-sm text-dt-text-muted">{{ $t('desk.empty.description') }}</p>
      </div>
      <NuxtLink to="/diaries/new">
        <BaseButton variant="secondary">
          <Icon name="heroicons:plus" class="h-5 w-5" />
          {{ $t('desk.actions.newDiary') }}
        </BaseButton>
      </NuxtLink>
    </section>

    <!-- No results state (has diaries but filters too narrow) -->
    <section v-else-if="diaryItems.length === 0 && hasActiveFilters" class="state-panel flex min-h-[220px] flex-wrap items-center justify-center gap-4 rounded-dt-md border border-dt-border bg-dt-surface p-5 text-center shadow-dt-md">
      <Icon name="heroicons:funnel" class="h-10 w-10 text-dt-text-soft" />
      <div>
        <h3 class="font-display text-xl tracking-tight text-dt-text">{{ $t('desk.noResults.title') }}</h3>
        <p class="mt-1 text-sm text-dt-text-muted">{{ $t('desk.noResults.description') }}</p>
      </div>
      <BaseButton variant="secondary" @click="resetFilters">
        {{ $t('desk.filter.clear') }}
      </BaseButton>
    </section>

    <!-- Diary list -->
    <section v-else class="ledger-list rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <header class="mb-4 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('desk.list.label') }}
          </p>
          <h2 class="font-display mt-1 text-2xl tracking-tight text-dt-text">
            {{ $t('desk.list.title') }}
          </h2>
        </div>
        <p class="font-data text-xs uppercase tracking-[0.1em] text-dt-text-soft">
          {{ pending ? $t('common.loading') : $t('desk.list.note') }}
        </p>
      </header>

      <NuxtLink
        v-for="diary in diaryItems"
        :key="diary.id"
        :to="`/diaries/${diary.id}`"
        class="ledger-row group cursor-pointer grid gap-4 border-t border-dt-border py-4 first:border-t-0 first:pt-0 last:pb-0"
      >
        <div class="ledger-row-main min-w-0">
          <div class="flex flex-col gap-1">
            <p class="font-data text-xs uppercase tracking-[0.12em] text-dt-secondary">
              {{ formatDiaryDate(diary.date || diary.createdAt) }}
            </p>
            <h3 class="font-display text-xl tracking-tight text-dt-text transition-colors group-hover:text-dt-primary">
              {{ diary.title || $t('desk.tasks.untitled') }}
            </h3>
          </div>
          <p class="mt-2 text-base leading-relaxed text-dt-text-muted">
            {{ getDiaryExcerpt(diary) }}
          </p>
        </div>

        <div class="ledger-row-side flex flex-col justify-between gap-3">
          <div class="flex flex-wrap gap-2">
            <StatusBadge v-if="diary.transactions?.length" tone="success">
              <Icon name="heroicons:currency-dollar" class="h-4 w-4" />
              {{ $t('desk.list.transactionCount', { count: diary.transactions.length }) }}
            </StatusBadge>
            <StatusBadge v-if="diary.alerts?.length" tone="warning">
              <Icon name="heroicons:bell" class="h-4 w-4" />
              {{ $t('desk.list.alertCount', { count: diary.alerts.length }) }}
            </StatusBadge>
            <StatusBadge v-if="!diary.transactions?.length && !diary.alerts?.length" tone="neutral">
              {{ $t('desk.list.textOnly') }}
            </StatusBadge>
          </div>
          <span class="inline-flex items-center gap-1 text-sm font-bold text-dt-primary">
            {{ $t('desk.list.openEntry') }}
            <Icon name="heroicons:arrow-right-20-solid" class="h-4 w-4" />
          </span>
        </div>
      </NuxtLink>

      <div v-if="loadMoreError" class="mt-4 flex flex-wrap items-center justify-center gap-3 rounded-dt-sm border border-dt-danger/30 bg-dt-danger/5 p-3 text-sm text-dt-danger">
        <span>{{ loadMoreError.message }}</span>
        <BaseButton variant="secondary" :disabled="loadingMore || pending" @click="loadMore">
          {{ $t('common.retry') }}
        </BaseButton>
      </div>
      <div v-else-if="hasMore" class="mt-4 flex justify-center">
          <BaseButton variant="secondary" :disabled="loadingMore || pending" @click="loadMore">
          <Icon v-if="loadingMore" name="svg-spinners:180-ring-with-bg" class="h-4 w-4" />
          {{ loadingMore ? $t('common.loading') : $t('common.loadMore') }}
        </BaseButton>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import type { DiariesApiResponse } from '~/types/diary'
import { useDiaryMutation } from '~/composables/useDiaryMutation'
import { useAppShell } from '~/composables/useAppShell'

definePageMeta({
  middleware: 'auth'
})
const { formatLocaleDate } = useTimezone()
const { t } = useI18n()

const { openQuickDiary: openGlobalQuickDiary } = useAppShell()
const openQuickDiary = () => openGlobalQuickDiary({ source: 'diaries' })

const filters = reactive({
  search: '',
  dateFrom: '',
  dateTo: '',
  sortBy: 'date-desc'
})

const searchInput = ref('')
const LIST_LIMIT = 20
let searchDebounce: ReturnType<typeof setTimeout> | undefined

watch(searchInput, (value) => {
  if (searchDebounce) clearTimeout(searchDebounce)
  searchDebounce = setTimeout(() => {
    filters.search = value.trim()
  }, 300)
})
onBeforeUnmount(() => {
  if (searchDebounce) clearTimeout(searchDebounce)
})

// Build reactive query params — API does the filtering/sorting
const queryParams = computed(() => {
  const params: Record<string, string> = {
    page: '1',
    limit: String(LIST_LIMIT),
  }
  if (filters.search) params.search = filters.search
  if (filters.dateFrom) params.dateFrom = filters.dateFrom
  if (filters.dateTo) params.dateTo = filters.dateTo
  if (filters.sortBy !== 'date-desc') params.sortBy = filters.sortBy
  return params
})

// Use lazy fetch to avoid calling API during SSR before auth check
// API returns { data, pagination }, so transform extracts both
const { data: apiResponse, pending, error, refresh } = await useLazyFetch<DiariesApiResponse>('/api/diaries', {
  query: queryParams,
})

const loadingMore = ref(false)
const loadMoreError = ref<Error | null>(null)
const currentPage = ref(1)

watch(queryParams, () => {
  currentPage.value = 1
  loadMoreError.value = null
})

const refreshAll = async () => {
  await refresh()
}

// Also refresh when floating FAB / other entry points save a diary
const { onDiaryMutation } = useDiaryMutation()
onDiaryMutation(() => {
  void refreshAll()
})

const diaryItems = computed<any[]>(() => apiResponse.value?.data ?? [])

const filteredTotal = computed<number>(() => apiResponse.value?.pagination?.total ?? 0)
const hasMore = computed(() => diaryItems.value.length < filteredTotal.value)

const loadMore = async () => {
  if (loadingMore.value || pending.value || !hasMore.value) return
  const nextPage = currentPage.value + 1
  loadingMore.value = true
  loadMoreError.value = null

  try {
    const response = await $fetch<DiariesApiResponse>('/api/diaries', {
      query: { ...queryParams.value, page: String(nextPage) },
    })
    const existing = new Set(diaryItems.value.map(diary => String(diary.id)))
    const nextItems = response.data.filter(diary => !existing.has(String(diary.id)))
    apiResponse.value = {
      ...response,
      data: [...diaryItems.value, ...nextItems],
    }
    currentPage.value = nextPage
  } catch (error) {
    loadMoreError.value = error instanceof Error ? error : new Error(String(error))
  } finally {
    loadingMore.value = false
  }
}

const hasActiveFilters = computed(() =>
  Boolean(filters.search || filters.dateFrom || filters.dateTo || filters.sortBy !== 'date-desc')
)

const filterSummary = computed(() => {
  if (pending.value) return t('desk.filter.loadingSummary')
  if (hasActiveFilters.value) return t('desk.filter.filteredSummary', { count: filteredTotal.value })
  if (!filteredTotal.value) return t('desk.filter.noDataSummary')
  return t('desk.filter.defaultSummary', { count: filteredTotal.value })
})

// Reset filters
const resetFilters = () => {
  searchInput.value = ''
  filters.search = ''
  filters.dateFrom = ''
  filters.dateTo = ''
  filters.sortBy = 'date-desc'
}

watch(error, (error) => {
  if (error) {
    console.error('Error fetching diaries:', error)
  }
})

const formatDiaryDate = (date: string | Date) => {
  return formatLocaleDate(date, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
}

const getDiaryExcerpt = (diary: { content?: string }) => {
  const plainText = (diary.content || '').replace(/[#*`>\-\n]/g, ' ').replace(/\s+/g, ' ').trim()
  return plainText || t('desk.list.noExcerpt')
}
</script>

<style scoped>
/* Minimal scoped CSS — only layout patterns that Tailwind can't express cleanly */

@media (min-width: 768px) {
  .ledger-row {
    grid-template-columns: minmax(0, 1fr) minmax(180px, 220px);
    align-items: start;
  }

  .ledger-row-side {
    align-items: flex-end;
    text-align: right;
  }
}

@media (min-width: 1024px) {
  .ledger-row {
    grid-template-columns: minmax(0, 1fr) minmax(170px, 200px);
    column-gap: 1.25rem;
  }
}
</style>
