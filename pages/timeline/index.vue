<template>
  <div class="timeline-page">
    <div class="fin-panel mb-8 flex flex-wrap justify-between items-center gap-4">
      <div>
        <p class="fin-kicker">Event Timeline</p>
        <h1 class="fin-title">{{ t('timeline.title') }}</h1>
      </div>
      <NuxtLink
        to="/diaries/new"
        class="fin-button-primary"
      >
        <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
        {{ t('diary.newDiary') }}
      </NuxtLink>
    </div>

    <!-- Filters -->
    <div class="fin-panel mb-8">
      <div class="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div>
          <label for="date-from" class="fin-label">
            {{ t('diary.dateFrom') }}
          </label>
          <input
            type="date"
            id="date-from"
            v-model="filters.dateFrom"
            class="fin-input"
          />
        </div>
        <div>
          <label for="date-to" class="fin-label">
            {{ t('diary.dateTo') }}
          </label>
          <input
            type="date"
            id="date-to"
            v-model="filters.dateTo"
            class="fin-input"
          />
        </div>
        <div class="flex items-end">
          <button
            @click="resetFilters"
            class="fin-button-secondary w-full"
          >
            <Icon name="heroicons:x-mark" class="mr-2 h-4 w-4" />
            {{ t('diary.clearFilters') }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="pending" class="fin-panel text-center py-16">
      <Icon name="svg-spinners:180-ring-with-bg" class="h-10 w-10 text-blue-600" />
      <p class="mt-4 text-slate-500 font-medium">{{ t('common.loading') }}</p>
    </div>

    <div v-else-if="error" class="fin-panel !border-red-200 !bg-red-50 dark:!border-red-900/50 dark:!bg-red-950/20 p-6">
      <div class="flex items-center gap-3">
        <Icon name="heroicons:x-circle" class="h-6 w-6 text-red-500" />
        <h3 class="text-lg font-bold text-red-800 dark:text-red-300">{{ t('diary.loadFailed') }}</h3>
      </div>
      <p class="mt-2 text-red-700 dark:text-red-400/90 ml-9">
        {{ error.message }}
      </p>
    </div>

    <div v-else-if="groupedDiaries.length === 0" class="fin-panel text-center py-20">
      <div class="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-6">
        <Icon name="heroicons:clock" class="h-10 w-10 text-slate-400" />
      </div>
      <h3 class="text-xl font-bold text-slate-900 dark:text-slate-100">{{ t('timeline.noEntries') }}</h3>
      <p class="mt-2 text-slate-500 max-w-xs mx-auto">{{ t('diary.noDiaries') }}</p>
      <div class="mt-8">
        <NuxtLink
          to="/diaries/new"
          class="fin-button-primary"
        >
          <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
          {{ t('diary.newDiary') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Timeline Content -->
    <div v-else class="relative pl-4 sm:pl-8">
      <!-- Vertical line -->
      <div class="absolute left-4 sm:left-8 top-0 bottom-0 w-0.5 bg-slate-200 dark:bg-slate-800"></div>

      <!-- Timeline items grouped by year/month -->
      <div v-for="group in groupedDiaries" :key="group.period" class="mb-12 relative">
        <!-- Period header -->
        <div class="flex items-center mb-6 -ml-2">
          <div class="w-4 h-4 bg-white dark:bg-slate-950 border-4 border-blue-600 dark:border-blue-500 rounded-full z-10"></div>
          <div class="ml-6 flex items-baseline gap-3">
            <h2 class="text-xl font-bold text-slate-900 dark:text-slate-100">
              {{ group.periodLabel }}
            </h2>
            <span class="text-xs font-bold px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
              {{ group.diaries.length }}
            </span>
          </div>
        </div>

        <!-- Diaries in this period -->
        <div class="space-y-6 ml-6 sm:ml-10">
          <NuxtLink
            v-for="diary in group.diaries"
            :key="String(diary.id)"
            :to="`/diaries/${diary.id}`"
            class="block group relative"
          >
            <!-- Timeline dot -->
            <div class="absolute -left-[31px] sm:-left-[39px] top-8 w-2 h-2 rounded-full z-10 transition-transform group-hover:scale-150"
              :class="diary.alerts?.length ? 'bg-amber-500 shadow-[0_0_0_4px_rgba(245,158,11,0.1)]' : 'bg-slate-400 dark:bg-slate-600 shadow-[0_0_0_4px_rgba(148,163,184,0.1)]'" />

            <!-- Card -->
            <div class="fin-panel !p-0 overflow-hidden group-hover:border-blue-300 dark:group-hover:border-blue-800 group-hover:shadow-xl group-hover:translate-x-1">
              <!-- Alert Banner -->
              <div v-if="diary.alerts?.length" class="bg-amber-50 dark:bg-amber-950/20 px-5 py-2.5 border-b border-amber-100 dark:border-amber-900/50">
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:bell-alert" class="h-4 w-4 text-amber-600 dark:text-amber-400" />
                  <span class="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400">
                    {{ t('timeline.reminders') }} ({{ diary.alerts.length }})
                  </span>
                </div>
              </div>

              <div class="p-5 sm:p-6">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
                  <div class="flex-1">
                    <h3 class="text-lg font-bold text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                      {{ diary.title }}
                    </h3>
                    <div class="flex items-center gap-3 mt-1.5">
                      <span class="text-xs font-medium text-slate-400 dark:text-slate-500 flex items-center">
                        <Icon name="heroicons:calendar" class="mr-1.5 h-3.5 w-3.5" />
                        {{ formatDate(diary.date || diary.createdAt) }}
                      </span>
                    </div>
                  </div>
                  
                  <!-- Badges -->
                  <div class="flex gap-2">
                    <div v-if="diary.transactions?.length" class="px-2 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-100 dark:border-emerald-900/50 rounded-lg flex items-center gap-1">
                      <Icon name="heroicons:currency-dollar" class="h-3.5 w-3.5 text-emerald-600" />
                      <span class="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">{{ diary.transactions.length }}</span>
                    </div>
                  </div>
                </div>

                <p class="mt-4 text-slate-600 dark:text-slate-400 text-sm line-clamp-2 leading-relaxed">
                  {{ diary.content ? diary.content.replace(/[#*`]/g, '') : t('timeline.noContent') }}
                </p>

                <div class="mt-6 flex items-center justify-between">
                  <div class="flex -space-x-2">
                    <div v-if="diary.alerts?.length" class="w-8 h-8 rounded-full bg-amber-100 dark:bg-amber-900/30 border-2 border-white dark:border-slate-900 flex items-center justify-center text-amber-600">
                      <Icon name="heroicons:bell" class="h-4 w-4" />
                    </div>
                    <div v-if="diary.transactions?.length" class="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 border-2 border-white dark:border-slate-900 flex items-center justify-center text-emerald-600">
                      <Icon name="heroicons:banknotes" class="h-4 w-4" />
                    </div>
                  </div>
                  
                  <span class="text-xs font-bold text-blue-600 dark:text-blue-400 flex items-center gap-1 group-hover:gap-2 transition-all">
                    {{ t('timeline.viewDetails') }}
                    <Icon name="heroicons:arrow-right" class="h-3.5 w-3.5" />
                  </span>
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Load More -->
      <div v-if="isHydrated && hasMore" class="mt-12 text-center pb-12">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="fin-button-primary min-w-[160px] disabled:opacity-50 disabled:cursor-not-allowed"
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

// Use the timeline diaries composable
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
