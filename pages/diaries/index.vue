<template>
  <div class="diary-page mx-auto max-w-[1280px] space-y-6">
    <!-- Mobile: action buttons first -->
    <section class="ledger-hero order-1 flex flex-col gap-4 rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md md:order-none md:flex-row md:flex-wrap md:items-end md:justify-between lg:grid lg:grid-cols-[1.7fr_240px] lg:items-end">
      <div class="hero-copy min-w-0">
        <p class="kicker text-xs font-bold uppercase tracking-[0.18em] text-dt-secondary">
          {{ $t('desk.kicker') }}
        </p>
        <h1 class="font-display mt-1.5 text-[clamp(2.2rem,5vw,3.2rem)] leading-[1.03] tracking-tight text-dt-text">
          {{ $t('desk.title') }}
        </h1>
        <p class="mt-3 max-w-[38rem] text-base leading-relaxed text-dt-text-muted">
          {{ $t('desk.summary') }}
        </p>

        <div class="mt-5 max-w-[46rem]">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('desk.snapshot.label') }}
          </p>
          <div class="mt-3 grid grid-cols-3 gap-3">
            <article class="stat-card flex flex-col gap-1 rounded-2xl border border-dt-border bg-dt-surface-strong p-4">
              <span class="font-data text-2xl font-bold text-dt-text">{{ totalDiaries }}</span>
              <span class="stat-label text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-soft">{{ $t('desk.snapshot.totalDiaries') }}</span>
            </article>
            <article class="stat-card flex flex-col gap-1 rounded-2xl border border-dt-border bg-dt-surface-strong p-4">
              <span class="font-data text-2xl font-bold text-dt-text">{{ diariesThisWeek }}</span>
              <span class="stat-label text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-soft">{{ $t('desk.snapshot.thisWeek') }}</span>
            </article>
            <article class="stat-card flex flex-col gap-1 rounded-2xl border border-dt-border bg-dt-surface-strong p-4">
              <span class="font-data text-2xl font-bold text-dt-text">{{ filteredTotal }}</span>
              <span class="stat-label text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-soft">{{ $t('desk.snapshot.filteredResults') }}</span>
            </article>
          </div>
        </div>
      </div>

      <div class="hero-actions flex flex-wrap items-start gap-3 lg:w-full lg:flex-col lg:items-stretch lg:self-end lg:justify-self-end">
        <BaseButton variant="primary" class="w-full lg:w-full" @click="openQuickDiary">
          <Icon name="heroicons:bolt" class="h-5 w-5" />
          {{ $t('desk.actions.quickDiary') }}
        </BaseButton>
        <NuxtLink to="/diaries/new" class="w-full lg:w-full">
          <BaseButton variant="secondary" class="w-full">
            <Icon name="heroicons:plus" class="h-5 w-5" />
            {{ $t('desk.actions.newDiary') }}
          </BaseButton>
        </NuxtLink>
        <NuxtLink to="/partners" class="w-full lg:w-full">
          <BaseButton variant="ghost" class="w-full">
            <Icon name="heroicons:user-group" class="h-5 w-5" />
            {{ $t('desk.actions.partners') }}
          </BaseButton>
        </NuxtLink>
      </div>
    </section>

    <QuickDiaryModal
      :show="showQuickModal"
      :context="quickDiaryContext"
      @close="closeQuickDiary"
      @created="handleDiaryCreated"
    />

    <div class="workspace-grid grid gap-4 lg:grid-cols-[2fr_0.58fr] lg:items-start">
      <!-- Next Move panel -->
      <LedgerCard>
          <div class="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
                {{ $t('desk.nextMove.label') }}
              </p>
              <h2 class="font-display mt-1 text-3xl leading-tight tracking-tight text-dt-text">
                {{ focusHeadline }}
              </h2>
            </div>
            <StatusBadge tone="accent">{{ focusStamp }}</StatusBadge>
          </div>

        <p class="mt-3 text-base leading-relaxed text-dt-text-muted">
          {{ focusDescription }}
        </p>

        <div class="task-grid mt-5 grid gap-3">
          <article class="task-card rounded-2xl border border-dt-border bg-dt-surface-strong p-4">
            <p class="stat-label text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('desk.nextMove.latestDiary') }}
            </p>
            <template v-if="latestDiary">
              <h3 class="mt-2 text-lg font-bold text-dt-text">
                {{ latestDiary.title || $t('desk.tasks.untitled') }}
              </h3>
              <p class="task-meta mt-1 font-data text-xs text-dt-secondary">
                {{ formatDiaryDate(latestDiary.date || latestDiary.createdAt) }}
              </p>
              <p class="mt-2 text-sm leading-relaxed text-dt-text-muted">
                {{ getDiaryExcerpt(latestDiary) }}
              </p>
            </template>
            <template v-else>
              <h3 class="mt-2 text-lg font-bold text-dt-text">
                {{ $t('desk.tasks.noDiaryTitle') }}
              </h3>
              <p class="mt-2 text-sm leading-relaxed text-dt-text-muted">
                {{ $t('desk.tasks.noDiaryText') }}
              </p>
            </template>
          </article>

          <article class="task-card rounded-2xl border border-dt-border bg-dt-surface-strong p-4">
            <p class="stat-label text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('desk.nextMove.alertReview') }}
            </p>
            <h3 class="mt-2 text-lg font-bold text-dt-text">
              {{ $t('desk.tasks.alertCountTitle', { count: totalOpenAlerts }) }}
            </h3>
            <p class="task-meta mt-1 font-data text-xs text-dt-secondary">
              {{ $t('desk.tasks.alertCountMeta', { count: diariesWithAlerts }) }}
            </p>
            <p class="mt-2 text-sm leading-relaxed text-dt-text-muted">
              {{ totalOpenAlerts > 0 ? $t('desk.tasks.hasAlertsText') : $t('desk.tasks.noAlertsText') }}
            </p>
          </article>

          <article class="task-card rounded-2xl border border-dt-border bg-dt-surface-strong p-4">
            <p class="stat-label text-xs font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ $t('desk.nextMove.tradeReview') }}
            </p>
            <h3 class="mt-2 text-lg font-bold text-dt-text">
              {{ $t('desk.tasks.tradeCountTitle', { count: totalTransactions }) }}
            </h3>
            <p class="task-meta mt-1 font-data text-xs text-dt-secondary">
              {{ $t('desk.tasks.tradeCountMeta', { count: diariesWithTransactions }) }}
            </p>
            <p class="mt-2 text-sm leading-relaxed text-dt-text-muted">
              {{ totalTransactions > 0 ? $t('desk.tasks.hasTradesText') : $t('desk.tasks.noTradesText') }}
            </p>
          </article>
        </div>
      </LedgerCard>

      <!-- Sidebar: Desk Rules -->
      <aside class="grid gap-4">
        <LedgerCard>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('desk.rules.label') }}
          </p>
          <h3 class="mt-2 text-lg font-bold text-dt-text">
            {{ $t('desk.rules.title') }}
          </h3>
          <div class="mt-3 grid gap-2.5">
            <article class="desk-rule grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-dt-border bg-dt-surface-strong p-3">
              <span class="desk-rule-index inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-dt-secondary/10 font-data text-xs font-bold text-dt-secondary">01</span>
              <p class="text-sm leading-relaxed text-dt-text-muted">{{ $t('desk.rules.rule1') }}</p>
            </article>
            <article class="desk-rule grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-dt-border bg-dt-surface-strong p-3">
              <span class="desk-rule-index inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-dt-secondary/10 font-data text-xs font-bold text-dt-secondary">02</span>
              <p class="text-sm leading-relaxed text-dt-text-muted">{{ $t('desk.rules.rule2') }}</p>
            </article>
            <article class="desk-rule grid grid-cols-[auto_1fr] gap-3 rounded-2xl border border-dt-border bg-dt-surface-strong p-3">
              <span class="desk-rule-index inline-flex h-8 min-w-[2rem] items-center justify-center rounded-full bg-dt-secondary/10 font-data text-xs font-bold text-dt-secondary">03</span>
              <p class="text-sm leading-relaxed text-dt-text-muted">{{ $t('desk.rules.rule3') }}</p>
            </article>
          </div>
        </LedgerCard>
      </aside>
    </div>

    <!-- Review Candidates -->
    <section v-if="reviewCandidates.length > 0" class="review-candidates-panel">
      <LedgerCard :title="t('review.candidates')" :description="t('review.candidatesDesc')">
        <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <ReviewCandidateCard
            v-for="diary in reviewCandidates"
            :key="diary.id"
            :date="formatDiaryDate(diary.date || diary.createdAt)"
            :title="diary.title || t('desk.tasks.untitled')"
            :thesis="diary.thesis"
            :risk="diary.risk"
            :review-status="diary.reviewStatus || 'none'"
            @review="navigateTo(`/diaries/${diary.id}`)"
          />
        </div>
      </LedgerCard>
    </section>

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
    </section>

    <!-- Empty state -->
    <section v-else-if="diaryItems.length === 0 && totalDiaries === 0 && !hasActiveFilters" class="state-panel flex min-h-[220px] flex-wrap items-center justify-center gap-4 rounded-dt-md border border-dt-border bg-dt-surface p-5 text-center shadow-dt-md">
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
import type { QuickDiaryContext } from '~/types/quicknote'
import type { DiariesApiResponse } from '~/types/diary'
import { useDiaryMutation } from '~/composables/useDiaryMutation'

definePageMeta({
  middleware: 'auth'
})
const { formatLocaleDate } = useTimezone()
const { t } = useI18n()

// Quick diary modal state
const showQuickModal = ref(false)
const quickDiaryContext = ref<QuickDiaryContext | null>(null)

const openQuickDiary = () => {
  quickDiaryContext.value = { source: 'diaries' }
  showQuickModal.value = true
}

const closeQuickDiary = () => {
  showQuickModal.value = false
  quickDiaryContext.value = null
}

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

const {
  data: summaryResponse,
  refresh: refreshSummary,
} = await useLazyFetch<any>('/api/diaries/summary')

const loadingMore = ref(false)
const loadMoreError = ref<Error | null>(null)
const currentPage = ref(1)

watch(queryParams, () => {
  currentPage.value = 1
  loadMoreError.value = null
})

const refreshAll = async () => {
  await Promise.all([refresh(), refreshSummary()])
}

const handleDiaryCreated = () => {
  void refreshAll()
}

// Also refresh when floating FAB / other entry points save a diary
const { onDiaryMutation } = useDiaryMutation()
onDiaryMutation(() => {
  void refreshAll()
})

const diaryItems = computed<any[]>(() => apiResponse.value?.data ?? [])

const filteredTotal = computed<number>(() => apiResponse.value?.pagination?.total ?? 0)
const totalDiaries = computed<number>(() => summaryResponse.value?.global?.totalDiaries ?? 0)
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

const reviewCandidates = computed<any[]>(() => summaryResponse.value?.reviewCandidates ?? [])

const latestDiary = computed<any | null>(() => summaryResponse.value?.latestDiary ?? null)

const totalOpenAlerts = computed(() => summaryResponse.value?.global?.totalOpenAlerts ?? 0)

const totalTransactions = computed(() => summaryResponse.value?.global?.totalTransactions ?? 0)

const diariesWithAlerts = computed(() => summaryResponse.value?.global?.diariesWithAlerts ?? 0)

const diariesWithTransactions = computed(() => summaryResponse.value?.global?.diariesWithTransactions ?? 0)

const diariesThisWeek = computed(() => summaryResponse.value?.currentWeek?.totalDiaries ?? 0)

const hasActiveFilters = computed(() =>
  Boolean(filters.search || filters.dateFrom || filters.dateTo || filters.sortBy !== 'date-desc')
)

const focusHeadline = computed(() => {
  if (!totalDiaries.value) {
    return t('desk.nextMove.noDiariesHeadline')
  }

  if (totalOpenAlerts.value > 0) {
    return t('desk.nextMove.hasAlertsHeadline', { count: totalOpenAlerts.value })
  }

  if (latestDiary.value) {
    return t('desk.nextMove.latestDiaryHeadline', {
      date: formatDiaryDate(latestDiary.value.date || latestDiary.value.createdAt)
    })
  }

  return t('desk.nextMove.defaultHeadline')
})

const focusStamp = computed(() => {
  if (!totalDiaries.value) return t('desk.nextMove.startStamp')
  if (totalOpenAlerts.value > 0) return t('desk.nextMove.riskCheckStamp')
  if (totalTransactions.value > 0) return t('desk.nextMove.reviewStamp')
  return t('desk.nextMove.writingStamp')
})

const focusDescription = computed(() => {
  if (!totalDiaries.value) {
    return t('desk.nextMove.noDiariesDesc')
  }

  if (totalOpenAlerts.value > 0) {
    return t('desk.nextMove.hasAlertsDesc')
  }

  if (totalTransactions.value > 0) {
    return t('desk.nextMove.hasTransactionsDesc')
  }

  return t('desk.nextMove.defaultDesc')
})

const filterSummary = computed(() => {
  if (pending.value) return t('desk.filter.loadingSummary')
  if (hasActiveFilters.value) return t('desk.filter.filteredSummary', { count: filteredTotal.value })
  if (!totalDiaries.value && !filteredTotal.value) return t('desk.filter.noDataSummary')
  return t('desk.filter.defaultSummary', { count: totalDiaries.value })
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

.hero-copy {
  flex: 1 1 42rem;
}

@media (min-width: 768px) {
  .task-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .task-card:first-child {
    grid-column: 1 / -1;
  }

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
  .task-grid {
    grid-template-columns: minmax(0, 1.45fr) minmax(260px, 1fr);
    align-items: stretch;
  }

  .task-card:first-child {
    grid-column: 1;
    grid-row: 1 / span 2;
  }

  .ledger-row {
    grid-template-columns: minmax(0, 1fr) minmax(170px, 200px);
    column-gap: 1.25rem;
  }
}

/* Mobile reorder: actions first, then sidebar, filters last */
@media (max-width: 767px) {
  .ledger-hero { order: 1; }
  .workspace-grid { order: 2; }
  .workspace-grid aside { order: 2; }
  .workspace-grid > :first-child { order: 1; }
}
</style>
