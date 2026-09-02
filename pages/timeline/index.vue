<template>
  <PageContainer width="app" class="timeline-page space-y-6 pb-20">
    <!-- Header -->
    <header class="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
          {{ t('timeline.kicker') }}
        </p>
        <h1 class="font-display mt-1.5 text-[clamp(1.9rem,4vw,2.75rem)] leading-tight tracking-tight text-dt-text">
          {{ t('timeline.title') }}
        </h1>
        <p class="mt-1 max-w-xl text-sm leading-relaxed text-dt-text-muted">
          {{ t('timeline.subtitle') }}
        </p>
      </div>

      <div class="flex items-center gap-3">
        <BaseButton variant="primary" @click="openQuickDiary">
          <Icon name="heroicons:pencil-square" class="mr-2 h-5 w-5" />
          {{ t('diary.newDiary') }}
        </BaseButton>
      </div>
    </header>

    <details class="timeline-overview rounded-dt-md border border-dt-border bg-dt-surface shadow-dt-sm" :aria-label="t('timeline.overview.summary.label')">
      <summary class="cursor-pointer rounded-dt-md p-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30 sm:p-5">
        <div class="grid grid-cols-3 gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ t('timeline.overview.summary.portfolioValue') }}
            </p>
            <p class="font-data mt-1 truncate text-base font-bold text-dt-text sm:text-lg">
              {{ holdingsPending || holdingsError || portfolioStats.currentMarketValue === null ? '—' : formatCurrency(portfolioStats.currentMarketValue) }}
            </p>
          </div>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ t('timeline.overview.summary.needsAttention') }}
            </p>
            <p class="font-data mt-1 truncate text-base font-bold text-dt-text sm:text-lg">
              {{ attentionPending || attentionError ? '—' : attentionCount }}
            </p>
          </div>
          <div class="min-w-0">
            <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
              {{ t('timeline.overview.summary.reviewsUpcoming') }}
            </p>
            <p class="font-data mt-1 truncate text-base font-bold text-dt-text sm:text-lg">
              {{ reviewsPending || reviewsError ? '—' : upcomingReviewCount }}
            </p>
          </div>
          <span class="col-span-3 inline-flex min-h-11 items-center justify-center gap-2 text-sm font-semibold text-dt-primary sm:col-span-1 sm:justify-self-end">
            {{ t('timeline.overview.summary.viewOverview') }}
            <Icon name="heroicons:chevron-down" class="timeline-overview-toggle-icon h-4 w-4" aria-hidden="true" />
          </span>
        </div>
      </summary>

      <div class="border-t border-dt-border p-3 sm:p-4">
        <div class="grid gap-4 lg:grid-cols-2">
      <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm" aria-labelledby="overview-portfolio-title">
        <div class="flex items-center justify-between gap-3">
          <h2 id="overview-portfolio-title" class="font-display text-xl text-dt-text">{{ t('timeline.overview.portfolio.title') }}</h2>
          <NuxtLink to="/stocks" class="text-sm font-semibold text-dt-primary hover:underline">{{ t('timeline.overview.viewPortfolio') }}</NuxtLink>
        </div>
        <AppSkeleton v-if="holdingsPending" class="mt-4" variant="card" :count="1" />
        <div v-else-if="holdingsError" class="mt-4 rounded-dt-sm border border-dt-danger/30 p-4" role="alert">
          <p class="text-sm text-dt-danger">{{ t('timeline.overview.portfolio.loadFailed') }}</p>
          <BaseButton variant="secondary" class="mt-3" @click="refreshPortfolio()">{{ t('common.retry') }}</BaseButton>
        </div>
        <div v-else-if="portfolioStats.totalHoldings === 0" class="mt-4">
          <p class="text-sm text-dt-text-muted">{{ t('timeline.overview.portfolio.empty') }}</p>
          <div class="mt-3 flex flex-wrap gap-2">
            <NuxtLink to="/diaries/new" class="text-sm font-semibold text-dt-primary hover:underline">{{ t('stock.dataQuality.addTransaction') }}</NuxtLink>
            <NuxtLink to="/stocks/watchlist" class="text-sm font-semibold text-dt-primary hover:underline">{{ t('stock.dataQuality.openWatchlist') }}</NuxtLink>
          </div>
        </div>
        <div v-else class="mt-4">
          <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div>
              <p class="text-xs text-dt-text-soft">{{ t('timeline.overview.portfolio.pricedValue') }}</p>
              <p class="font-data mt-1 text-lg font-bold text-dt-text">{{ portfolioStats.currentMarketValue === null ? '—' : formatCurrency(portfolioStats.currentMarketValue) }}</p>
            </div>
            <div>
              <p class="text-xs text-dt-text-soft">{{ t('stock.dashboard.totalInvested') }}</p>
              <p class="font-data mt-1 text-lg font-bold text-dt-text">{{ formatCurrency(portfolioStats.totalCost) }}</p>
            </div>
            <div>
              <p class="text-xs text-dt-text-soft">{{ t('stock.riskSummary.largestPosition') }}</p>
              <p class="font-data mt-1 text-lg font-bold text-dt-text">{{ portfolioStats.largestPositionPct === null ? '—' : `${portfolioStats.largestPositionPct.toFixed(1)}%` }}</p>
            </div>
            <div>
              <p class="text-xs text-dt-text-soft">{{ t('stock.riskSummary.top3Concentration') }}</p>
              <p class="font-data mt-1 text-lg font-bold text-dt-text">{{ portfolioStats.top3ConcentrationPct === null ? '—' : `${portfolioStats.top3ConcentrationPct.toFixed(1)}%` }}</p>
            </div>
          </div>
          <p class="mt-3 text-xs text-dt-text-muted" role="status">
            {{ t(`stock.dataQuality.status.${portfolioStats.valuationStatus}`, { priced: portfolioStats.pricedPositionCount, total: portfolioStats.totalHoldings, cost: formatCurrency(portfolioStats.unpricedCostBasis) }) }}
            <template v-if="portfolioStats.valuationAsOf"> · {{ t('stock.dataQuality.asOf', { time: formatOverviewDate(portfolioStats.valuationAsOf) }) }}</template>
          </p>
          <p v-if="portfolioQuoteError" class="mt-2 text-xs text-dt-warning">{{ t('timeline.overview.portfolio.quoteFailed') }}</p>
        </div>
      </section>

      <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm" aria-labelledby="overview-attention-title">
        <div class="flex items-center justify-between gap-3">
          <h2 id="overview-attention-title" class="font-display text-xl text-dt-text">{{ t('timeline.overview.attention.title') }}</h2>
          <NuxtLink to="/reviews" class="text-sm font-semibold text-dt-primary hover:underline">{{ t('timeline.overview.viewReviews') }}</NuxtLink>
        </div>
        <AppSkeleton v-if="reviewsPending || attentionPending" class="mt-4" variant="card" :count="1" />
        <div v-else-if="attentionError && reviewsError && holdingsError" class="mt-4" role="alert">
          <p class="text-sm text-dt-danger">{{ t('timeline.overview.sectionUnavailable') }}</p>
        </div>
        <ul v-else-if="needsReviewItems.length" class="mt-4 space-y-2">
          <li v-for="item in needsReviewItems" :key="item.id">
            <NuxtLink :to="item.to" class="flex min-h-11 items-center justify-between rounded-dt-sm border border-dt-border px-3 py-2 text-sm hover:bg-dt-surface-strong">
              <span class="font-medium text-dt-text">{{ item.label }}</span>
              <span class="text-xs text-dt-danger">{{ item.reason }}</span>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="mt-4 text-sm text-dt-text-muted">{{ t('timeline.overview.attention.empty') }}</p>
        <p v-if="attentionError || attentionPartial || reviewsError || holdingsError" class="mt-3 text-xs text-dt-warning" role="status">{{ t('timeline.overview.partialData') }}</p>
      </section>

      <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm" aria-labelledby="overview-activity-title">
        <div class="flex items-center justify-between gap-3">
          <h2 id="overview-activity-title" class="font-display text-xl text-dt-text">{{ t('timeline.overview.activity.title') }}</h2>
          <a href="#diary-timeline" class="text-sm font-semibold text-dt-primary hover:underline">{{ t('timeline.overview.activity.fullHistory') }}</a>
        </div>
        <AppSkeleton v-if="activityPending" class="mt-4" variant="card" :count="1" />
        <p v-else-if="activityError" class="mt-4 text-sm text-dt-danger" role="alert">{{ t('timeline.overview.activity.loadFailed') }}</p>
        <ul v-else-if="activityItems.length" class="mt-4 divide-y divide-dt-border">
          <li v-for="item in activityItems" :key="item.id">
            <NuxtLink :to="item.destination" class="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-dt-primary">
              <span class="min-w-0 truncate font-medium">{{ item.symbol ? `${item.symbol} · ` : '' }}{{ item.title }}</span>
              <time class="shrink-0 text-xs text-dt-text-soft">{{ formatActivityDate(item.occurredAt) }}</time>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="mt-4 text-sm text-dt-text-muted">{{ t('timeline.overview.activity.empty') }}</p>
      </section>

      <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm" aria-labelledby="overview-upcoming-title">
        <div class="flex items-center justify-between gap-3">
          <h2 id="overview-upcoming-title" class="font-display text-xl text-dt-text">{{ t('timeline.overview.upcoming.title') }}</h2>
          <NuxtLink to="/reviews" class="text-sm font-semibold text-dt-primary hover:underline">{{ t('timeline.overview.viewReviews') }}</NuxtLink>
        </div>
        <AppSkeleton v-if="reviewsPending" class="mt-4" variant="card" :count="1" />
        <div v-else-if="reviewsError" class="mt-4" role="alert">
          <p class="text-sm text-dt-danger">{{ t('timeline.overview.upcoming.loadFailed') }}</p>
          <BaseButton variant="secondary" class="mt-3" @click="refreshReviews()">{{ t('common.retry') }}</BaseButton>
        </div>
        <ul v-else-if="upcomingReviewItems.length" class="mt-4 divide-y divide-dt-border">
          <li v-for="review in upcomingReviewItems" :key="String(review.id)">
            <NuxtLink :to="review.targetType === 'thesis' ? `/stocks/${encodeURIComponent(review.symbol || '')}?tab=thesis&review=${review.thesisId || review.id}` : `/diaries/${review.id}/review`" class="flex min-h-11 items-center justify-between gap-3 py-2 text-sm hover:text-dt-primary">
              <span class="min-w-0 truncate font-medium">{{ review.targetType === 'thesis' && review.symbol ? `${review.symbol} · ` : '' }}{{ review.title }}</span>
              <span class="shrink-0 text-xs text-dt-text-soft">{{ review.reviewDueAt ? formatOverviewDate(review.reviewDueAt) : t('review.queue.sections.unscheduled') }}</span>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="mt-4 text-sm text-dt-text-muted">{{ t('timeline.overview.upcoming.empty') }}</p>
      </section>
        </div>
      </div>
    </details>

    <div id="diary-timeline" class="scroll-mt-4">
      <TimelineModeSwitch />
    </div>

    <!-- Filters -->
    <details class="rounded-dt-sm border border-dt-border bg-dt-surface px-4 py-3">
      <summary class="cursor-pointer text-sm font-semibold text-dt-text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30">
        {{ t('desk.filter.title') }}
      </summary>
      <div class="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
        <label class="block">
          <span class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
            {{ t('diary.dateFrom') }}
          </span>
          <input
            v-model="filters.dateFrom"
            type="date"
            class="w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2.5 font-data text-sm text-dt-text outline-none transition-colors focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
          />
        </label>
        <label class="block">
          <span class="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
            {{ t('diary.dateTo') }}
          </span>
          <input
            v-model="filters.dateTo"
            type="date"
            class="w-full rounded-dt-sm border border-dt-border bg-dt-surface-strong px-3 py-2.5 font-data text-sm text-dt-text outline-none transition-colors focus:border-dt-primary focus:ring-2 focus:ring-dt-primary/20"
          />
        </label>
        <div class="flex items-end">
          <BaseButton variant="ghost" class="w-full md:w-auto" @click="resetFilters">
            <Icon name="heroicons:x-mark" class="mr-1.5 h-4 w-4" />
            {{ t('diary.clearFilters') }}
          </BaseButton>
        </div>
      </div>
    </details>

    <!-- Loading -->
    <div v-if="!isHydrated || pending" class="rounded-dt-md border border-dt-border bg-dt-surface px-6 py-16 text-center shadow-dt-sm">
      <Icon name="svg-spinners:180-ring-with-bg" class="mx-auto h-8 w-8 text-dt-primary" />
      <p class="mt-4 text-sm font-medium text-dt-text-muted">{{ t('common.loading') }}</p>
    </div>

    <!-- Error -->
    <div
      v-else-if="error"
      class="rounded-dt-md border border-dt-danger/30 bg-dt-surface px-6 py-10 text-center shadow-dt-sm"
    >
      <Icon name="heroicons:exclamation-triangle" class="mx-auto h-7 w-7 text-dt-danger" />
      <h3 class="mt-3 text-lg font-semibold text-dt-text">{{ t('diary.loadFailed') }}</h3>
      <p class="mx-auto mt-2 max-w-sm text-sm text-dt-text-muted">
        {{ error.message }}
      </p>
      <div class="mt-6">
        <BaseButton variant="secondary" @click="refresh()">
          <Icon name="heroicons:arrow-path" class="h-4 w-4" />
          {{ t('common.retry') }}
        </BaseButton>
      </div>
    </div>

    <!-- Empty -->
    <div
      v-else-if="groupedDiaries.length === 0"
      class="rounded-dt-md border border-dt-border bg-dt-surface px-6 py-16 text-center shadow-dt-sm"
    >
      <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-dt-md border border-dt-border bg-dt-surface-strong">
        <Icon name="heroicons:clock" class="h-8 w-8 text-dt-text-soft" />
      </div>
      <h3 class="font-display mt-6 text-2xl text-dt-text">{{ t('timeline.noEntries') }}</h3>
      <p class="mx-auto mt-2 max-w-xs text-sm text-dt-text-muted">{{ t('diary.noDiaries') }}</p>
      <div class="mt-8">
        <BaseButton variant="primary" @click="openQuickDiary">
          <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
          {{ t('diary.newDiary') }}
        </BaseButton>
      </div>
    </div>

    <!-- Timeline -->
    <div v-else class="timeline-stream">
      <section
        v-for="(group, groupIndex) in groupedDiaries"
        :key="group.period"
        class="timeline-month"
        :class="{ 'timeline-month--spaced': groupIndex > 0 }"
      >
        <div class="timeline-month-heading flex items-center justify-between border-b border-dt-border pb-2">
          <h2 class="text-sm font-semibold tracking-wide text-dt-text">
            {{ group.periodLabel }}
          </h2>
          <span class="font-data text-xs text-dt-text-muted">
            {{ t('timeline.entriesCount', { count: group.diaries.length }) }}
          </span>
        </div>

        <div class="timeline-month-entries">
          <div
            v-for="diary in group.diaries"
            :key="String(diary.id)"
            class="timeline-entry group relative grid grid-cols-[24px_minmax(0,1fr)] items-stretch gap-x-3 lg:grid-cols-[112px_32px_minmax(0,1fr)]"
          >
            <time
              class="timeline-date hidden flex-col items-center text-center lg:flex"
              :datetime="diary.date"
            >
              <span class="timeline-date-day font-data">{{ formatTimelineDay(diary.date) }}</span>
              <span class="timeline-date-month">{{ formatTimelineMonth(diary.date) }}</span>
              <span class="timeline-date-weekday">{{ formatTimelineWeekday(diary.date) }}</span>
            </time>

            <div class="timeline-rail-cell relative flex min-h-full justify-center" aria-hidden="true">
              <span
                class="timeline-node relative z-10 mt-4 block h-3 w-3 shrink-0 rounded-full border-2 border-dt-surface bg-dt-border-strong transition-colors duration-150 group-hover:bg-dt-primary-solid"
                :class="{ '!bg-dt-warning': diary.alerts?.length }"
              />
              <span class="timeline-connector absolute h-px bg-dt-border-strong transition-colors duration-150 group-hover:bg-dt-primary-solid" />
            </div>

            <NuxtLink
              :to="`/diaries/${diary.id}`"
              class="timeline-entry-card block w-full max-w-[920px] rounded-dt-md border border-dt-border bg-dt-surface px-4 py-4 shadow-dt-sm transition-colors duration-150 hover:border-dt-border-strong hover:bg-dt-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/40 sm:px-5 sm:py-5 lg:px-5 lg:py-[18px]"
            >
              <div class="flex min-w-0 items-start gap-3">
                <h3 class="line-clamp-2 min-w-0 flex-1 text-[17px] font-semibold leading-[1.35] tracking-tight text-dt-text transition-colors duration-150 group-hover:text-dt-primary sm:text-lg">
                  {{ diary.title }}
                </h3>
                <Icon
                  name="heroicons:arrow-right"
                  class="mt-0.5 h-4 w-4 shrink-0 text-dt-text-soft transition-colors duration-150 group-hover:text-dt-primary"
                  aria-hidden="true"
                />
              </div>

              <div class="timeline-meta mt-1.5 flex flex-wrap items-center text-[11px] leading-5 text-dt-text-soft sm:text-xs">
                <time class="timeline-meta-item inline-flex items-center font-data text-dt-text-muted">
                  <Icon name="heroicons:calendar" class="mr-1 h-3.5 w-3.5 text-dt-text-soft" aria-hidden="true" />
                  {{ formatDiaryCompactDate(diary.date) }}
                </time>
                <span
                  v-for="tag in (diary.tags || []).slice(0, 2)"
                  :key="tag"
                  class="timeline-meta-item font-medium"
                >
                  #{{ tag }}
                </span>
                <span
                  v-if="diary.tradePlanSummary"
                  class="timeline-meta-item inline-flex min-w-0 max-w-full items-center gap-1 text-dt-primary"
                  :title="tradePlanSignal(diary.tradePlanSummary)"
                >
                  <Icon name="heroicons:map" class="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                  <span class="truncate">{{ tradePlanSignal(diary.tradePlanSummary) }}</span>
                </span>
                <span v-if="diary.transactions?.length" class="timeline-meta-item inline-flex items-center gap-1 text-dt-success">
                  <Icon name="heroicons:banknotes" class="h-3.5 w-3.5" aria-hidden="true" />
                  {{ t('timeline.transactionsCount', { count: diary.transactions.length }) }}
                </span>
                <span v-if="diary.reviewStatus === 'reviewed'" class="timeline-meta-item inline-flex items-center gap-1 text-dt-secondary">
                  <Icon name="heroicons:clipboard-document-check" class="h-3.5 w-3.5" aria-hidden="true" />
                  {{ reviewSignal(diary.reviewOutcome) }}
                </span>
                <span v-if="diary.alerts?.length" class="timeline-meta-item inline-flex items-center gap-1 text-dt-warning">
                  <Icon name="heroicons:bell" class="h-3.5 w-3.5" aria-hidden="true" />
                  {{ t('timeline.alertsCount', { count: diary.alerts.length }) }}
                </span>
              </div>

              <p class="mt-2.5 line-clamp-2 text-sm leading-[1.55] text-dt-text-muted">
                {{ stripDiaryMarkdown(diary.content) || t('timeline.noContent') }}
              </p>
            </NuxtLink>
          </div>
        </div>
      </section>

      <div v-if="isHydrated && hasMore" class="pt-4 text-center">
        <BaseButton
          variant="secondary"
          :disabled="loadingMore"
          @click="loadMore"
        >
          <Icon
            :name="loadingMore ? 'svg-spinners:180-ring-with-bg' : 'heroicons:arrow-path'"
            class="mr-2 h-5 w-5"
          />
          {{ loadingMore ? t('common.loading') : t('common.loadMore') }}
        </BaseButton>
      </div>
    </div>

  </PageContainer>
</template>

<script setup lang="ts">
import { formatCalendarDate, formatShortDate, formatUserDateTime } from '~/lib/dates'
import { resolveUserTimezone } from '~/lib/dates/user-tz'
import { stripDiaryMarkdown } from '~/lib/diary-excerpt'
import { formatCurrency } from '~/lib/format'
import { computePortfolioAggregations, type PortfolioValuationResponse } from '~/lib/stocks-view'
import type { InvestmentActivityItem } from '~/lib/investment-activity'
import type { InvestmentActivityResponse } from '~/lib/contracts/activity'
import type { PortfolioAttentionResponse } from '~/types/portfolio-attention'
import { emptyReviewGroups, type ReviewGroups } from '~/types/reviews'
import { useDiaryMutation } from '~/composables/useDiaryMutation'
import { useTimelineDiaries } from '~/composables/useTimelineDiaries'
import { useAppShell } from '~/composables/useAppShell'

const { t, locale } = useI18n()
const { user } = useAuth()

const emptyPortfolioProjection = (): PortfolioValuationResponse => ({
  holdings: [],
  valuation: computePortfolioAggregations([]),
  quoteErrors: [],
  marketState: null,
})

const {
  data: portfolioProjection,
  pending: holdingsPending,
  error: holdingsError,
  refresh: refreshPortfolio,
} = await useLazyFetch<PortfolioValuationResponse>('/api/stocks/portfolio', {
  default: emptyPortfolioProjection,
})
const portfolioStats = computed(() => portfolioProjection.value?.valuation ?? computePortfolioAggregations([]))
const portfolioQuoteError = computed(() => (portfolioProjection.value?.quoteErrors.length ?? 0) > 0)

const {
  data: attentionProjection,
  pending: attentionPending,
  error: attentionError,
} = await useLazyFetch<PortfolioAttentionResponse>('/api/portfolio/attention', {
  default: (): PortfolioAttentionResponse => ({ items: [], asOf: new Date().toISOString(), coverage: { valuationStatus: 'empty', complete: false, priced: 0, total: 0 } }),
})

const {
  data: activityProjection,
  pending: activityPending,
  error: activityError,
} = await useLazyFetch<InvestmentActivityResponse>('/api/investment-activity', {
  query: { limit: 5 },
  default: (): InvestmentActivityResponse => ({
    data: [],
    pagination: { nextCursor: null, hasMore: false, asOf: new Date().toISOString() },
  }),
})

const {
  data: overviewReviews,
  pending: reviewsPending,
  error: reviewsError,
  refresh: refreshReviews,
} = await useLazyFetch<ReviewGroups>('/api/reviews', {
  default: emptyReviewGroups,
})
const reviewGroups = computed(() => overviewReviews.value ?? emptyReviewGroups())
const upcomingReviewItems = computed(() => [
  ...reviewGroups.value.upcoming,
  ...reviewGroups.value.unscheduled,
].slice(0, 4))
const upcomingReviewCount = computed(() => reviewGroups.value.upcoming.length + reviewGroups.value.unscheduled.length)
const timelineTimezone = computed(() => resolveUserTimezone(user.value))
const formatOverviewDate = (value: string) => formatUserDateTime(value, {
  timezone: timelineTimezone.value,
  locale: locale.value || 'zh-TW',
  format: { dateStyle: 'medium' },
})

const formatDiaryPart = (date: string, options: Intl.DateTimeFormatOptions) => formatCalendarDate(date, {
  locale: locale.value || 'zh-TW',
  format: options,
})
const formatTimelineDay = (date: string) => formatDiaryPart(date, { day: '2-digit' }).replace(/\D/g, '')
const formatTimelineMonth = (date: string) => formatDiaryPart(date, { month: 'short' })
const formatTimelineWeekday = (date: string) => formatDiaryPart(date, { weekday: 'short' })
const formatCompactDate = (date: Date | string) => formatShortDate(date, timelineTimezone.value)
const formatDiaryCompactDate = (date: string) => formatDiaryPart(date, { year: 'numeric', month: '2-digit', day: '2-digit' })
const formatActivityDate = (date: string) => /^\d{4}-\d{2}-\d{2}$/.test(date)
  ? formatDiaryCompactDate(date)
  : formatCompactDate(date)
const reviewSignal = (outcome?: string | null) => outcome
  ? `${t('review.statusReviewed')} · ${t(`review.outcomes.${outcome}`)}`
  : t('review.statusReviewed')
const tradePlanSignal = (summary: NonNullable<import('~/lib/contracts/diary').DiaryResponse['tradePlanSummary']>) => [
  t('timeline.tradePlansCount', { count: summary.total }),
  ...summary.statuses.map(({ status, count }) => `${t(`tradePlan.status.${status}`)} ${count}`),
].join(' · ')

definePageMeta({
  middleware: 'auth'
})

const {
  isHydrated,
  pending,
  error,
  loadingMore,
  filters,
  diaries,
  hasMore,
  groupedDiaries,
  loadMore,
  refresh,
  resetFilters
} = useTimelineDiaries()

const recentDiaries = computed(() => diaries.value.slice(0, 5))
const activityItems = computed(() => activityProjection.value
  ? activityProjection.value.data
  : recentDiaries.value.map(diary => ({
      id: `diary:${diary.id}`,
      title: diary.title,
      symbol: null,
      occurredAt: diary.date,
      destination: `/diaries/${diary.id}`,
    } satisfies Pick<InvestmentActivityItem, 'id' | 'title' | 'symbol' | 'occurredAt' | 'destination'>)))
const attentionPartial = computed(() => {
  const coverage = attentionProjection.value?.coverage
  return Boolean(coverage && coverage.total > 0 && !coverage.complete)
})
const needsReviewItems = computed(() => (attentionProjection.value?.items ?? []).slice(0, 5).map(item => ({
  id: item.id,
  label: item.symbol || item.evidence.title || t('timeline.overview.attention.portfolio'),
  reason: t(`timeline.overview.attention.reasons.${item.reason}`),
  to: item.action,
})))
const attentionCount = computed(() => attentionProjection.value?.items.length ?? 0)

const { openQuickDiary: openGlobalQuickDiary } = useAppShell()
const openQuickDiary = () => openGlobalQuickDiary({ source: 'timeline' })

const { onDiaryMutation } = useDiaryMutation()
onDiaryMutation(() => {
  void refresh()
})
</script>

<style scoped>
.timeline-month--spaced {
  margin-top: 1.75rem;
}

.timeline-overview > summary {
  list-style: none;
}

.timeline-overview > summary::-webkit-details-marker {
  display: none;
}

.timeline-overview[open] .timeline-overview-toggle-icon {
  transform: rotate(180deg);
}

.timeline-month-heading {
  min-height: 2rem;
}

.timeline-month-entries {
  position: relative;
}

.timeline-entry + .timeline-entry {
  margin-top: 0.75rem;
}

.timeline-entry::before {
  position: absolute;
  top: 0;
  bottom: -0.75rem;
  left: 12px;
  width: 1px;
  background: var(--color-border);
  content: '';
}

.timeline-entry:last-child::before {
  bottom: 0;
}

.timeline-date {
  padding-top: 0.25rem;
}

.timeline-date-day {
  color: var(--color-primary);
  font-size: 1.75rem;
  font-weight: 600;
  line-height: 1;
}

.timeline-date-month,
.timeline-date-weekday {
  color: var(--color-text-muted);
  font-size: 0.75rem;
  line-height: 1.35;
}

.timeline-date-month {
  margin-top: 0.4rem;
}

.timeline-meta-item + .timeline-meta-item::before {
  margin-inline: 0.5rem;
  color: var(--color-text-soft);
  content: '·';
}

.timeline-connector {
  top: 22px;
  right: -12px;
  left: calc(50% + 5px);
}

@media (min-width: 1024px) {
  .timeline-entry::before {
    left: 140px;
  }
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

input[type='date']::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.55;
}

.dark input[type='date']::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
</style>
