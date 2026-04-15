<template>
  <div class="timeline-page pb-20">
    <!-- Modern Header Section -->
    <header class="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6 px-1">
      <div class="space-y-1">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold uppercase tracking-wider mb-2 border border-blue-100 dark:border-blue-800/50">
          <Icon name="heroicons:clock" class="w-3.5 h-3.5" />
          {{ t('timeline.kicker') }}
        </div>
        <h1 class="text-4xl font-black text-slate-900 dark:text-white tracking-tight leading-none">
          {{ t('timeline.title') }}
        </h1>
        <p class="text-slate-500 dark:text-slate-400 text-sm font-medium">
          {{ t('timeline.subtitle') }}
        </p>
      </div>
      
      <div class="flex items-center gap-3">
        <NuxtLink
          to="/timeline/compare"
          class="inline-flex items-center justify-center px-5 py-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/90 dark:bg-slate-900/80 text-slate-700 dark:text-slate-100 font-bold shadow-sm hover:border-indigo-300 hover:text-indigo-600 dark:hover:border-indigo-500 dark:hover:text-indigo-300 transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <Icon name="heroicons:rectangle-group" class="mr-2 h-5 w-5" />
          {{ t('compareDiary.title') }}
        </NuxtLink>
        <NuxtLink
          to="/diaries/new"
          class="inline-flex items-center justify-center px-6 py-3 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold shadow-xl shadow-slate-200 dark:shadow-none hover:scale-105 transition-all active:scale-95 group focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <Icon name="heroicons:pencil-square" class="mr-2 h-5 w-5 group-hover:rotate-12 transition-transform" />
          {{ t('diary.newDiary') }}
        </NuxtLink>
      </div>
    </header>

    <!-- Refined Filters Section -->
    <div class="relative z-20 mb-16 p-1.5 bg-slate-100/50 dark:bg-slate-800/40 backdrop-blur-xl rounded-2xl border border-slate-200/60 dark:border-slate-700/50 shadow-sm">
      <div class="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2">
        <div class="relative group">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Icon name="heroicons:calendar" class="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="date"
            v-model="filters.dateFrom"
            class="w-full bg-white dark:bg-slate-900 border-none rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
          />
          <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <span class="text-[10px] font-black uppercase tracking-tighter text-slate-300 dark:text-slate-300 group-focus-within:opacity-0 transition-opacity" :class="{ 'opacity-0': filters.dateFrom }">{{ t('diary.dateFrom') }}</span>
          </div>
        </div>
        
        <div class="relative group">
          <div class="absolute inset-y-0 left-4 flex items-center pointer-events-none">
            <Icon name="heroicons:calendar" class="w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
          </div>
          <input
            type="date"
            v-model="filters.dateTo"
            class="w-full bg-white dark:bg-slate-900 border-none rounded-xl py-3.5 pl-11 pr-4 text-sm font-bold text-slate-700 dark:text-slate-100 focus:ring-2 focus:ring-blue-500 transition-all appearance-none"
          />
          <div class="absolute inset-y-0 right-4 flex items-center pointer-events-none">
            <span class="text-[10px] font-black uppercase tracking-tighter text-slate-300 dark:text-slate-300 group-focus-within:opacity-0 transition-opacity" :class="{ 'opacity-0': filters.dateTo }">{{ t('diary.dateTo') }}</span>
          </div>
        </div>
        
        <button
          @click="resetFilters"
          class="flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-all group border-none shadow-sm focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950"
        >
          <Icon name="heroicons:trash" class="w-4 h-4 group-hover:shake" />
          {{ t('diary.clearFilters') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="pending" class="py-24 text-center">
      <div class="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-50 dark:bg-blue-900/20 mb-6">
        <Icon name="svg-spinners:180-ring-with-bg" class="h-8 w-8 text-blue-600" />
      </div>
      <p class="text-slate-500 font-bold animate-pulse">{{ t('common.loading') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="bg-red-50/50 dark:bg-red-900/10 backdrop-blur-md border border-red-100 dark:border-red-900/30 rounded-3xl p-8 text-center">
      <div class="inline-flex items-center justify-center w-14 h-14 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
        <Icon name="heroicons:exclamation-triangle" class="h-6 w-6 text-red-600" />
      </div>
      <h3 class="text-lg font-black text-red-900 dark:text-red-400">{{ t('diary.loadFailed') }}</h3>
      <p class="mt-2 text-red-700/70 dark:text-red-400/60 text-sm max-w-sm mx-auto">
        {{ error.message }}
      </p>
    </div>

    <!-- Empty State -->
    <div v-else-if="groupedDiaries.length === 0" class="py-24 text-center">
      <div class="w-24 h-24 bg-slate-100 dark:bg-slate-800/50 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-12">
        <Icon name="heroicons:clock" class="h-12 w-12 text-slate-300 dark:text-slate-300" />
      </div>
      <h3 class="text-2xl font-black text-slate-900 dark:text-white">{{ t('timeline.noEntries') }}</h3>
      <p class="mt-3 text-slate-500 dark:text-slate-400 max-w-xs mx-auto font-medium">{{ t('diary.noDiaries') }}</p>
      <div class="mt-10">
        <NuxtLink
          to="/diaries/new"
          class="fin-button-primary hover:scale-105 transition-transform"
        >
          <Icon name="heroicons:plus" class="mr-2 h-5 w-5" />
          {{ t('diary.newDiary') }}
        </NuxtLink>
      </div>
    </div>

    <!-- Timeline Content -->
    <div v-else class="relative pl-6 sm:pl-12">
      <!-- Gradient Vertical line -->
      <div class="absolute left-[26px] sm:left-[50px] top-0 bottom-0 w-1 bg-gradient-to-b from-blue-500 via-indigo-500/50 to-purple-500/0 dark:from-blue-600 dark:via-indigo-600/30 dark:to-purple-900/0 rounded-full opacity-30"></div>

      <!-- Timeline items grouped by year/month -->
      <div v-for="group in groupedDiaries" :key="group.period" class="mb-16 relative">
        <!-- Period header - Sticky -->
        <div class="sticky top-[170px] z-10 flex items-center mb-10 -ml-2 py-4">
          <div class="w-5 h-5 bg-white dark:bg-slate-950 border-4 border-blue-600 dark:border-blue-500 rounded-full z-20 shadow-[0_0_0_8px_rgba(37,99,235,0.1)]"></div>
          <div class="ml-10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border border-slate-200/50 dark:border-slate-800/50 px-5 py-2 rounded-2xl flex items-center gap-4 shadow-xl shadow-slate-200/20 dark:shadow-none">
            <h2 class="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest">
              {{ group.periodLabel }}
            </h2>
            <div class="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-700"></div>
            <span class="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2 py-0.5 rounded-md uppercase tracking-tighter">
              {{ group.diaries.length }} entries
            </span>
          </div>
        </div>

        <!-- Diaries in this period -->
        <div class="space-y-8 ml-6 sm:ml-10">
          <NuxtLink
            v-for="diary in group.diaries"
            :key="String(diary.id)"
            :to="`/diaries/${diary.id}`"
            class="block group relative focus-visible:outline-none"
          >
            <!-- Timeline dot -->
            <div class="absolute -left-[32px] sm:-left-[42px] top-10 w-2.5 h-2.5 rounded-full z-10 transition-all duration-500 group-hover:scale-[2] border-2 border-white dark:border-slate-950"
              :class="diary.alerts?.length ? 'bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'bg-slate-400 dark:bg-slate-600 group-hover:bg-blue-500 shadow-sm'" />

            <!-- Elegant Card -->
            <div class="relative bg-white dark:bg-slate-900/40 backdrop-blur-sm border border-slate-200/60 dark:border-slate-800/60 rounded-3xl p-6 sm:p-8 shadow-sm group-hover:shadow-2xl group-hover:shadow-blue-500/10 group-hover:border-blue-400/50 dark:group-hover:border-blue-500/30 group-hover:translate-x-2 focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950 transition-all duration-500 overflow-hidden">
              <!-- Subtle Background Pattern -->
              <div class="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] pointer-events-none group-hover:opacity-[0.07] transition-opacity">
                <div class="absolute inset-0" style="background-image: radial-gradient(circle at 2px 2px, currentColor 1px, transparent 0); background-size: 24px 24px;"></div>
              </div>

              <!-- Content Container -->
              <div class="relative z-10">
                <div class="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-6">
                  <div class="space-y-2">
                    <h3 class="text-xl sm:text-2xl font-black text-slate-900 dark:text-slate-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors tracking-tight leading-tight">
                      {{ diary.title }}
                    </h3>
                    <div class="flex flex-wrap items-center gap-4">
                      <time class="text-xs font-bold text-slate-400 dark:text-slate-400 flex items-center bg-slate-50 dark:bg-slate-800/50 px-2 py-1 rounded-lg">
                        <Icon name="heroicons:calendar" class="mr-2 h-4 w-4 text-blue-500/70" />
                        {{ formatDate(diary.date || diary.createdAt) }}
                      </time>
                      
                      <div v-if="diary.tags?.length" class="flex gap-2">
                        <span v-for="tag in diary.tags.slice(0, 2)" :key="tag" class="text-[10px] font-black text-slate-400 dark:text-slate-400 uppercase tracking-wider">
                          #{{ tag }}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div class="flex flex-wrap gap-2">
                    <span v-if="diary.alerts?.length" class="inline-flex items-center px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-black border border-amber-100/50 dark:border-amber-800/30 shadow-sm">
                      <Icon name="heroicons:bell" class="mr-1.5 w-3.5 h-3.5" />
                      {{ diary.alerts.length }} {{ t('timeline.reminders') }}
                    </span>
                    <span v-if="diary.transactions?.length" class="inline-flex items-center px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-[10px] font-black border border-emerald-100/50 dark:border-emerald-800/30 shadow-sm">
                      <Icon name="heroicons:banknotes" class="mr-1.5 w-3.5 h-3.5" />
                      {{ diary.transactions.length }} Trades
                    </span>
                  </div>
                </div>

                <p class="mt-6 text-slate-600 dark:text-slate-400 text-sm sm:text-base line-clamp-2 leading-relaxed font-medium">
                  {{ diary.content ? diary.content.replace(/[#*`]/g, '') : t('timeline.noContent') }}
                </p>

                <div class="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                  <div class="flex -space-x-3">
                    <div v-if="diary.alerts?.length" class="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/30 border-4 border-white dark:border-slate-900 flex items-center justify-center text-amber-600 shadow-sm">
                      <Icon name="heroicons:bell" class="h-5 w-5" />
                    </div>
                    <div v-if="diary.transactions?.length" class="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 border-4 border-white dark:border-slate-900 flex items-center justify-center text-emerald-600 shadow-sm">
                      <Icon name="heroicons:banknotes" class="h-5 w-5" />
                    </div>
                  </div>
                  
                  <div class="flex items-center gap-2 text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest group-hover:gap-4 transition-all">
                    {{ t('timeline.viewDetails') }}
                    <Icon name="heroicons:arrow-right" class="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                  </div>
                </div>
              </div>
            </div>
          </NuxtLink>
        </div>
      </div>

      <!-- Load More Section -->
      <div v-if="isHydrated && hasMore" class="mt-20 text-center pb-20">
        <button
          @click="loadMore"
          :disabled="loadingMore"
          class="relative inline-flex items-center justify-center px-10 py-4 rounded-2xl bg-white dark:bg-slate-900 text-slate-900 dark:text-white font-black text-sm border-2 border-slate-200 dark:border-slate-800 hover:border-blue-500 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed group shadow-xl shadow-slate-200/50 dark:shadow-none"
        >
          <Icon v-if="loadingMore" name="svg-spinners:180-ring-with-bg" class="mr-3 h-5 w-5" />
          <Icon v-else name="heroicons:arrow-path" class="mr-3 h-5 w-5 group-hover:rotate-180 transition-transform duration-700" />
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
  max-width: 800px;
  margin: 0 auto;
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

@keyframes shake {
  0%, 100% { transform: rotate(0deg); }
  25% { transform: rotate(-10deg); }
  75% { transform: rotate(10deg); }
}

.group:hover .group-hover\:shake {
  animation: shake 0.3s ease-in-out infinite;
}

/* Custom scrollbar for better look in filters area */
input[type="date"]::-webkit-calendar-picker-indicator {
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.2s;
}

input[type="date"]::-webkit-calendar-picker-indicator:hover {
  opacity: 1;
}

.dark input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
</style>
