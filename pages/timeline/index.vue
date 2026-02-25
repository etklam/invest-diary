<template>
  <div class="timeline-page">
    <div class="panel mb-6 flex flex-wrap justify-between items-center gap-3">
      <div>
        <p class="kicker">Event Timeline</p>
        <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">{{ t('timeline.title') }}</h1>
      </div>
      <NuxtLink
        to="/diaries/new"
        class="action-btn cursor-pointer"
      >
        <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
        {{ t('diary.newDiary') }}
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="panel mb-6">
      <div class="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label for="date-from" class="block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
            {{ t('diary.dateFrom') }}
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
            {{ t('diary.dateTo') }}
          </label>
          <input
            type="date"
            id="date-to"
            v-model="filters.dateTo"
            class="field"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="resetFilters"
            class="w-full action-btn-muted cursor-pointer"
          >
            <Icon name="heroicons:x-mark" class="mr-2 h-4 w-4" />
            {{ t('diary.clearFilters') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="pending" class="panel text-center py-12">
      <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-blue-700" />
      <p class="mt-2 text-slate-500">{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="error" class="rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900/80 dark:bg-red-950/30">
      <div class="flex">
        <div class="flex-shrink-0">
          <Icon name="heroicons:x-circle" class="h-5 w-5 text-red-400" />
        </div>
        <div class="ml-3">
          <h3 class="text-sm font-semibold text-red-800 dark:text-red-200">{{ t('diary.loadFailed') }}</h3>
          <div class="mt-2 text-sm text-red-700 dark:text-red-200/90">
            {{ error.message }}
          </div>
        </div>
      </div>
    </div>

    <div v-else-if="groupedDiaries.length === 0" class="panel text-center py-12">
      <Icon name="heroicons:clock" class="mx-auto h-12 w-12 text-slate-400" />
      <h3 class="mt-2 text-sm font-semibold text-slate-900 dark:text-slate-100">{{ t('timeline.noEntries') }}</h3>
      <p class="mt-1 text-sm text-slate-500">{{ t('diary.noDiaries') }}</p>
      <div class="mt-6">
        <NuxtLink
          to="/diaries/new"
          class="action-btn cursor-pointer"
        >
          <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
          {{ t('diary.newDiary') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Timeline -->
    <div v-else class="relative">
      <!-- Vertical line -->
      <div class="absolute left-4 sm:left-8 top-0 bottom-0 w-0.5 bg-gradient-to-b from-blue-700 via-blue-500 to-blue-300 dark:from-slate-700 dark:via-slate-600 dark:to-slate-800"></div>

      <!-- Timeline items grouped by year/month -->
      <div v-for="group in groupedDiaries" :key="group.period" class="mb-8">
        <!-- Period header -->
        <div class="relative flex items-center mb-4 pl-10 sm:pl-20">
          <div class="absolute left-4 sm:left-8 w-4 h-4 bg-indigo-500 dark:bg-slate-500 rounded-full border-4 border-white dark:border-slate-950 transform -translate-x-1/2"></div>
          <h2 class="text-lg sm:text-xl font-semibold text-slate-800 dark:text-slate-100">
            {{ group.periodLabel }}
          </h2>
          <span class="ml-3 text-sm text-slate-500 dark:text-slate-400">
            {{ t('timeline.entriesCount', { count: group.diaries.length }) }}
          </span>
        </div>

        <!-- Diaries in this period -->
        <div class="space-y-4 pl-10 sm:pl-20">
          <NuxtLink
            v-for="diary in group.diaries"
            :key="String(diary.id)"
            :to="`/diaries/${diary.id}`"
            class="relative block group"
          >
            <!-- Timeline dot -->
            <div class="absolute left-0 sm:left-8 top-6 w-3 h-3 rounded-full border-2 border-white dark:border-slate-950 transform -translate-x-1/2 group-hover:scale-125 transition-all"
              :class="diary.alerts?.length ? 'bg-amber-400 dark:bg-amber-700 group-hover:bg-amber-500 dark:group-hover:bg-amber-600' : 'bg-blue-500 dark:bg-sky-600 group-hover:bg-blue-700 dark:group-hover:bg-sky-500'" />

            <!-- Card -->
            <div class="ml-6 sm:ml-12 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden"
              :class="diary.alerts?.length ? 'bg-amber-50 dark:bg-slate-900 border-amber-200 dark:border-amber-900/70' : 'bg-white dark:bg-slate-950 border-blue-100 dark:border-slate-800'">
              <!-- 提醒標籤 -->
              <div v-if="diary.alerts?.length" class="bg-amber-100 dark:bg-amber-950/20 px-4 py-2 border-b border-amber-200 dark:border-amber-900/70">
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:bell-alert" class="h-4 w-4 text-amber-600 dark:text-amber-200" />
                  <span class="text-xs font-medium text-amber-800 dark:text-amber-200">{{ t('timeline.reminders') }}</span>
                </div>
                <div class="mt-1 space-y-1">
                  <p v-for="(alert, idx) in diary.alerts.slice(0, 2)" :key="idx" class="text-xs text-amber-700 dark:text-amber-200/90 truncate">
                    • {{ alert.message }}
                  </p>
                  <p v-if="diary.alerts.length > 2" class="text-xs text-amber-600 dark:text-amber-300/90">
                    {{ t('timeline.moreReminders', { count: diary.alerts.length - 2 }) }}
                  </p>
                </div>
              </div>

              <div class="p-4 sm:p-6">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                  <h3 class="text-lg font-semibold text-slate-900 dark:text-slate-200 group-hover:text-blue-700 dark:group-hover:text-sky-300 transition-colors">
                    {{ diary.title }}
                  </h3>
                  <span class="text-xs text-slate-500 dark:text-slate-400 whitespace-nowrap flex items-center">
                    <Icon name="heroicons:calendar" class="mr-1 h-4 w-4" />
                    {{ formatDate(diary.date || diary.createdAt) }}
                  </span>
                </div>

                <p class="mt-2 text-slate-600 dark:text-slate-300 text-sm line-clamp-2">
                  {{ diary.content ? diary.content.replace(/[#*`]/g, '') : t('timeline.noContent') }}
                </p>

                <div class="mt-4 flex flex-wrap items-center gap-3">
                  <span v-if="diary.transactions?.length" class="flex items-center text-xs text-slate-500 dark:text-slate-400">
                    <Icon name="heroicons:currency-dollar" class="mr-1 h-4 w-4 text-green-500" />
                    {{ t('timeline.transactionsCount', { count: diary.transactions.length }) }}
                  </span>
                  <span v-if="diary.alerts?.length" class="flex items-center text-xs text-amber-600 dark:text-amber-400">
                    <Icon name="heroicons:bell" class="mr-1 h-4 w-4" />
                    {{ t('timeline.alertsCount', { count: diary.alerts.length }) }}
                  </span>
                  <span class="text-blue-700 dark:text-sky-300 text-xs font-semibold group-hover:text-blue-500 dark:group-hover:text-sky-200">
                    {{ t('timeline.viewDetails') }}
                  </span>
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Load More Button -->
      <div v-if="isHydrated && hasMore" class="mt-8 text-center">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="action-btn cursor-pointer disabled:bg-slate-400 disabled:cursor-not-allowed"
        >
          <Icon v-if="loadingMore" name="svg-spinners:180-ring-with-bg" class="mr-2 h-5 w-5" />
          {{ loadingMore ? t('common.loading') : t('common.loadMore') }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n()

definePageMeta({
  middleware: 'auth'
})

// Use the timeline diaries composable for pagination, filtering, and grouping
const {
  isHydrated,
  pending,
  error,
  loadingMore,
  filters,
  hasMore,
  groupedDiaries,
  loadMore,
  resetFilters,
  formatDate
} = useTimelineDiaries()
</script>

<style scoped>
.timeline-page {
  max-width: 980px;
  margin: 0 auto;
}

.panel {
  border: 1px solid rgb(191 219 254);
  border-radius: 0.95rem;
  padding: 1rem;
  background: rgb(255 255 255 / 84%);
  backdrop-filter: blur(8px);
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

.action-btn-muted {
  width: 100%;
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

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
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

:global(.dark .action-btn), :global(.dark-mode .action-btn) {
  background: #1e3a8a;
  color: rgb(226 232 240);
}

:global(.dark .action-btn):hover, :global(.dark-mode .action-btn):hover {
  background: #1d4ed8;
}
</style>
