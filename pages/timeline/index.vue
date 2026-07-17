<template>
  <div class="timeline-page mx-auto max-w-[880px] space-y-6 pb-20">
    <!-- Header -->
    <header class="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
      <div class="min-w-0">
        <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
          {{ t('timeline.kicker') }}
        </p>
        <h1 class="font-display mt-1.5 text-[clamp(1.9rem,4vw,2.75rem)] leading-tight tracking-tight text-dt-text">
          {{ t('timeline.title') }}
        </h1>
        <p class="mt-2 max-w-xl text-sm leading-relaxed text-dt-text-muted sm:text-base">
          {{ t('timeline.subtitle') }}
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-3">
        <NuxtLink to="/timeline/compare" class="inline-flex">
          <BaseButton variant="secondary">
            <Icon name="heroicons:rectangle-group" class="mr-2 h-5 w-5" />
            {{ t('compareDiary.title') }}
          </BaseButton>
        </NuxtLink>
        <BaseButton variant="primary" @click="openQuickDiary">
          <Icon name="heroicons:pencil-square" class="mr-2 h-5 w-5" />
          {{ t('diary.newDiary') }}
        </BaseButton>
      </div>
    </header>

    <!-- Filters -->
    <LedgerCard>
      <div class="grid grid-cols-1 gap-3 md:grid-cols-[1fr_1fr_auto]">
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
    </LedgerCard>

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
    <div v-else class="relative pl-5 sm:pl-10">
      <div class="absolute bottom-0 left-[11px] top-2 w-px bg-dt-border sm:left-[19px]" />

      <div
        v-for="group in groupedDiaries"
        :key="group.period"
        class="relative mb-10"
      >
        <div class="sticky top-[4.5rem] z-10 mb-5 flex items-center gap-3 bg-dt-bg/90 py-2 backdrop-blur-[2px]">
          <div class="relative z-10 h-3 w-3 shrink-0 rounded-full border-2 border-dt-primary bg-dt-surface sm:ml-2" />
          <div class="flex min-w-0 flex-wrap items-center gap-2 rounded-dt-sm border border-dt-border bg-dt-surface px-3 py-1.5 shadow-dt-sm">
            <h2 class="text-sm font-semibold tracking-wide text-dt-text">
              {{ group.periodLabel }}
            </h2>
            <StatusBadge tone="neutral">
              {{ group.diaries.length }}
            </StatusBadge>
          </div>
        </div>

        <div class="space-y-3 sm:ml-4">
          <NuxtLink
            v-for="diary in group.diaries"
            :key="String(diary.id)"
            :to="`/diaries/${diary.id}`"
            class="group relative block rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm transition-colors duration-150 hover:border-dt-border-strong hover:bg-dt-surface-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dt-primary/30 sm:p-6"
          >
            <div
              class="absolute -left-[21px] top-7 h-2 w-2 rounded-full border-2 border-dt-surface sm:-left-[29px]"
              :class="diary.alerts?.length ? 'bg-dt-warning' : 'bg-dt-border-strong group-hover:bg-dt-primary'"
            />

            <div class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="min-w-0 space-y-2">
                <h3 class="text-lg font-semibold leading-snug tracking-tight text-dt-text group-hover:text-dt-primary sm:text-xl">
                  {{ diary.title }}
                </h3>
                <div class="flex flex-wrap items-center gap-2">
                  <time class="font-data inline-flex items-center rounded-md bg-dt-surface-strong px-2 py-1 text-xs text-dt-text-muted">
                    <Icon name="heroicons:calendar" class="mr-1.5 h-3.5 w-3.5 text-dt-text-soft" />
                    {{ formatDate(diary.date || diary.createdAt) }}
                  </time>
                  <span
                    v-for="tag in (diary.tags || []).slice(0, 2)"
                    :key="tag"
                    class="text-[11px] font-medium text-dt-text-soft"
                  >
                    #{{ tag }}
                  </span>
                </div>
              </div>

              <div class="flex flex-wrap gap-2">
                <StatusBadge v-if="diary.alerts?.length" tone="warning">
                  {{ diary.alerts.length }} {{ t('timeline.reminders') }}
                </StatusBadge>
                <StatusBadge v-if="diary.transactions?.length" tone="success">
                  {{ diary.transactions.length }} Trades
                </StatusBadge>
              </div>
            </div>

            <p class="mt-4 line-clamp-2 text-sm leading-relaxed text-dt-text-muted">
              {{ diary.content ? diary.content.replace(/[#*`]/g, '') : t('timeline.noContent') }}
            </p>

            <div class="mt-5 flex items-center justify-between border-t border-dt-border pt-4">
              <div class="flex items-center gap-2 text-dt-text-soft">
                <Icon
                  v-if="diary.alerts?.length"
                  name="heroicons:bell"
                  class="h-4 w-4 text-dt-warning"
                />
                <Icon
                  v-if="diary.transactions?.length"
                  name="heroicons:banknotes"
                  class="h-4 w-4 text-dt-success"
                />
              </div>
              <span class="inline-flex items-center gap-1 text-xs font-semibold text-dt-primary">
                {{ t('timeline.viewDetails') }}
                <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
              </span>
            </div>
          </NuxtLink>
        </div>
      </div>

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

    <QuickDiaryModal
      :show="showQuickModal"
      :context="quickDiaryContext"
      @close="closeQuickDiary"
      @created="refresh"
    />
  </div>
</template>

<script setup lang="ts">
import type { QuickDiaryContext } from '~/types/quicknote'
import { useDiaryMutation } from '~/composables/useDiaryMutation'
import { useTimelineDiaries } from '~/composables/useTimelineDiaries'

const { t } = useI18n()

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
  resetFilters,
  formatDate
} = useTimelineDiaries()

const showQuickModal = ref(false)
const quickDiaryContext = ref<QuickDiaryContext | null>(null)

const openQuickDiary = () => {
  quickDiaryContext.value = { source: 'timeline' }
  showQuickModal.value = true
}

const closeQuickDiary = () => {
  showQuickModal.value = false
  quickDiaryContext.value = null
}

const { onDiaryMutation } = useDiaryMutation()
onDiaryMutation(() => {
  void refresh()
})
</script>

<style scoped>
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
