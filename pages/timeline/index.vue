<template>
  <div class="timeline-page mx-auto w-full max-w-[1180px] space-y-6 pb-20">
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

    <TimelineModeSwitch />

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
    <div v-if="pending" class="rounded-dt-md border border-dt-border bg-dt-surface px-6 py-16 text-center shadow-dt-sm">
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
              :datetime="String(diary.date || diary.createdAt)"
            >
              <span class="timeline-date-day font-data">{{ formatTimelineDay(diary.date || diary.createdAt) }}</span>
              <span class="timeline-date-month">{{ formatTimelineMonth(diary.date || diary.createdAt) }}</span>
              <span class="timeline-date-weekday">{{ formatTimelineWeekday(diary.date || diary.createdAt) }}</span>
            </time>

            <div class="timeline-rail-cell relative flex min-h-full justify-center" aria-hidden="true">
              <span
                class="timeline-node relative z-10 mt-4 block h-3 w-3 shrink-0 rounded-full border-2 border-dt-surface bg-dt-border-strong transition-colors duration-150 group-hover:bg-dt-primary"
                :class="{ '!bg-dt-warning': diary.alerts?.length }"
              />
              <span class="timeline-connector absolute h-px bg-dt-border-strong transition-colors duration-150 group-hover:bg-dt-primary" />
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
                  {{ formatCompactDate(diary.date || diary.createdAt) }}
                </time>
                <span
                  v-for="tag in (diary.tags || []).slice(0, 2)"
                  :key="tag"
                  class="timeline-meta-item font-medium"
                >
                  #{{ tag }}
                </span>
                <span v-if="diary.alerts?.length" class="timeline-meta-item inline-flex items-center gap-1 text-dt-warning">
                  <Icon name="heroicons:bell" class="h-3.5 w-3.5" aria-hidden="true" />
                  {{ t('timeline.alertsCount', { count: diary.alerts.length }) }}
                </span>
                <span v-if="diary.transactions?.length" class="timeline-meta-item inline-flex items-center gap-1 text-dt-success">
                  <Icon name="heroicons:banknotes" class="h-3.5 w-3.5" aria-hidden="true" />
                  {{ t('timeline.transactionsCount', { count: diary.transactions.length }) }}
                </span>
              </div>

              <p class="mt-2.5 line-clamp-2 text-sm leading-[1.55] text-dt-text-muted">
                {{ diary.content ? diary.content.replace(/[#*`]/g, '') : t('timeline.noContent') }}
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

  </div>
</template>

<script setup lang="ts">
import { formatShortDate } from '~/lib/dates'
import { useDiaryMutation } from '~/composables/useDiaryMutation'
import { useTimelineDiaries } from '~/composables/useTimelineDiaries'
import { useAppShell } from '~/composables/useAppShell'

const { t, locale } = useI18n()
const { user } = useAuth()

const timelineTimezone = computed(() => user.value?.timezone || 'Asia/Taipei')

const formatTimelinePart = (date: Date | string, options: Intl.DateTimeFormatOptions) => {
  return new Intl.DateTimeFormat(locale.value || 'zh-TW', {
    ...options,
    timeZone: timelineTimezone.value,
  }).format(new Date(date))
}

const formatTimelineDay = (date: Date | string) => formatTimelinePart(date, { day: '2-digit' }).replace(/\D/g, '')
const formatTimelineMonth = (date: Date | string) => formatTimelinePart(date, { month: 'short' })
const formatTimelineWeekday = (date: Date | string) => formatTimelinePart(date, { weekday: 'short' })
const formatCompactDate = (date: Date | string) => formatShortDate(date, timelineTimezone.value)

definePageMeta({
  middleware: 'auth'
})

const {
  isHydrated,
  pending,
  error,
  loadingMore,
  filters,
  hasMore,
  groupedDiaries,
  loadMore,
  refresh,
  resetFilters
} = useTimelineDiaries()

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
