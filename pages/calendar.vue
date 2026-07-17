<template>
  <div class="calendar-page">
    <header class="fin-panel mb-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p class="fin-kicker">{{ t('calendar.intelligence') }}</p>
          <h1 class="fin-title">
            {{ t('calendar.title', { year: currentYear, month: currentMonth + 1 }) }}
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="previousMonth"
            class="fin-button-secondary !p-2"
            :aria-label="t('common.previous')"
          >
            <Icon name="heroicons:chevron-left" class="h-5 w-5" />
          </button>
          <button
            @click="nextMonth"
            class="fin-button-secondary !p-2"
            :aria-label="t('common.next')"
          >
            <Icon name="heroicons:chevron-right" class="h-5 w-5" />
          </button>
        </div>
      </div>
      
      <div class="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div class="metric-card">
          <p class="fin-label !mb-1">{{ t('calendar.daysInMonth') }}</p>
          <p class="text-2xl font-bold text-slate-800 dark:text-slate-200">{{ daysInMonth }}</p>
        </div>
        <div class="metric-card">
          <p class="fin-label !mb-1">{{ t('calendar.diaryCount') }}</p>
          <p class="text-2xl font-bold text-blue-600 dark:text-blue-400">{{ monthDiaryCount }}</p>
        </div>
        <div class="metric-card">
          <p class="fin-label !mb-1">{{ t('calendar.coverage') }}</p>
          <div class="flex items-baseline gap-2">
            <p class="text-2xl font-bold text-indigo-600 dark:text-indigo-400">{{ monthCoverage }}</p>
            <span class="text-xs text-slate-400">{{ t('calendar.excludeHolidays') }}</span>
          </div>
        </div>
      </div>
    </header>

    <section class="fin-panel overflow-hidden">
      <div class="grid grid-cols-7 gap-px bg-slate-200 dark:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
        <div
          v-for="day in weekDays"
          :key="day"
          class="bg-slate-50 dark:bg-slate-900/50 text-center text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 py-3"
        >
          {{ day }}
        </div>

        <div
          v-for="n in firstDayOfWeek"
          :key="'blank-' + n"
          class="bg-white dark:bg-slate-950/30 h-20 sm:h-28"
        />

        <button
          v-for="day in daysInMonth"
          :key="day"
          type="button"
          @click="handleDateClick(day)"
          class="day-cell group relative bg-white dark:bg-slate-950 h-20 sm:h-28 p-2 text-left transition-all hover:bg-slate-50 dark:hover:bg-slate-900"
          :class="{
            'is-today': isToday(day),
            'has-diary': hasDiary(day),
            'is-holiday': isExcludedHoliday(day)
          }"
        >
          <span class="text-sm font-semibold transition-colors" :class="isToday(day) ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'">
            {{ day }}
          </span>
          
          <div v-if="isToday(day)" class="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse"></div>

          <div v-if="hasDiary(day)" class="mt-1">
            <div class="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-tight group-hover:text-blue-600 dark:group-hover:text-blue-400">
              {{ getDiaryForDay(day)?.title }}
            </div>
            <div class="absolute bottom-2 right-2 flex gap-1">
              <div class="w-1.5 h-1.5 rounded-full bg-blue-500" :title="t('nav.diaries')"></div>
              <div v-if="getDiaryForDay(day)?.alerts?.length" class="w-1.5 h-1.5 rounded-full bg-amber-500" :title="t('nav.alerts')"></div>
              <div v-if="getDiaryForDay(day)?.transactions?.length" class="w-1.5 h-1.5 rounded-full bg-emerald-500" :title="t('stock.dashboard.quickTransaction')"></div>
            </div>
          </div>
          
          <div v-if="isExcludedHoliday(day)" class="absolute inset-0 pointer-events-none opacity-[0.03] dark:opacity-[0.05]" 
               style="background-image: repeating-linear-gradient(-45deg, currentColor, currentColor 1px, transparent 1px, transparent 10px);">
          </div>
        </button>
      </div>
    </section>

    <section class="fin-panel mt-6">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-bold text-slate-800 dark:text-slate-200">{{ t('calendar.activityHeatmap') }}</h2>
        <div class="flex items-center gap-4 text-[10px] uppercase tracking-widest font-bold text-slate-400">
          <div class="flex items-center gap-1">
            <div class="w-2.5 h-2.5 rounded-sm bg-slate-200 dark:bg-slate-800"></div>
            <span>{{ t('calendar.notRecorded') }}</span>
          </div>
          <div class="flex items-center gap-1">
            <div class="w-2.5 h-2.5 rounded-sm bg-blue-600"></div>
            <span>{{ t('calendar.recorded') }}</span>
          </div>
        </div>
      </div>
      
      <div class="heatmap-container overflow-x-auto pb-2">
        <div class="flex gap-1 min-w-max">
          <div v-for="(week, weekIndex) in heatmapDays" :key="`week-${weekIndex}`" class="flex flex-col gap-1">
            <div
              v-for="(cell, dayIndex) in week"
              :key="`cell-${weekIndex}-${dayIndex}`"
              class="w-3 h-3 rounded-sm transition-colors"
              :class="{
                'bg-transparent': !cell,
                'bg-slate-200 dark:bg-slate-800': cell && cell.level === 0 && !cell.excluded,
                'bg-blue-600 shadow-sm shadow-blue-500/20': cell && cell.level === 1,
                'bg-slate-300 dark:bg-slate-700 opacity-50': cell && cell.excluded
              }"
              :title="cell ? `${cell.dateKey}: ${cell.level === 1 ? t('calendar.recorded') : t('calendar.notRecorded')}${cell.excluded ? ' (' + t('calendar.holiday') + ')' : ''}` : ''"
            />
          </div>
        </div>
      </div>
    </section>

    <div class="mt-8 flex flex-col sm:flex-row gap-4 justify-center">
      <button
        @click="openQuickDiary()"
        class="fin-button-primary"
      >
        <Icon name="heroicons:bolt" class="mr-2 h-5 w-5" />
        {{ t('calendar.quickDiary') }}
      </button>
      <button
        @click="goToToday"
        class="fin-button-secondary"
      >
        {{ t('calendar.backToToday') }}
      </button>
    </div>

    <QuickDiaryModal
      :show="showQuickModal"
      :context="quickDiaryContext"
      @close="closeQuickDiary"
      @created="fetchDiaries"
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useCalendar } from '~/composables/useCalendar'
import { useDiaryMutation } from '~/composables/useDiaryMutation'
import { useI18n } from '#imports'
import type { QuickDiaryContext } from '~/types/quicknote'

definePageMeta({
  middleware: 'auth'
})

const { t } = useI18n()

const {
  currentYear,
  currentMonth,
  weekDays,
  daysInMonth,
  firstDayOfWeek,
  monthDiaryCount,
  monthCoverage,
  heatmapDays,
  fetchDiaries,
  previousMonth,
  nextMonth,
  goToToday,
  hasDiary,
  getDiaryForDay,
  isToday,
  isExcludedHoliday
} = useCalendar()

const showQuickModal = ref(false)
const quickDiaryContext = ref<QuickDiaryContext | null>(null)

const openQuickDiary = (date?: string) => {
  quickDiaryContext.value = {
    source: 'calendar',
    ...(date ? { date } : {}),
  }
  showQuickModal.value = true
}

const closeQuickDiary = () => {
  showQuickModal.value = false
  // Clear date/source so the next open does not inherit the previous day
  quickDiaryContext.value = null
}

const handleDateClick = (day: number) => {
  const dateStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const diary = getDiaryForDay(day)

  if (diary) {
    navigateTo(`/diaries/${diary.id}`)
  } else {
    openQuickDiary(dateStr)
  }
}

// Refresh when floating FAB or other surfaces create/append a diary
const { onDiaryMutation } = useDiaryMutation()
onDiaryMutation(() => {
  fetchDiaries()
})
</script>

<style scoped>
.calendar-page {
  max-width: 1000px;
  margin: 0 auto;
}

.metric-card {
  padding: 1rem;
  border-radius: 0.75rem;
  background: rgb(248 250 252 / 50%);
  border: 1px solid rgb(226 232 240);
}

.dark .metric-card {
  background: rgb(30 41 59 / 30%);
  border-color: rgb(51 65 85);
}

.day-cell.is-today {
  background: rgb(239 246 255);
  box-shadow: inset 0 0 0 1px rgb(59 130 246 / 30%);
}

.dark .day-cell.is-today {
  background: rgb(30 58 138 / 20%);
  box-shadow: inset 0 0 0 1px rgb(59 130 246 / 20%);
}

.day-cell.is-holiday {
  background: rgb(248 250 252);
}

.dark .day-cell.is-holiday {
  background: rgb(15 23 42 / 50%);
}

.line-clamp-2 {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.heatmap-container::-webkit-scrollbar {
  height: 4px;
}

.heatmap-container::-webkit-scrollbar-track {
  background: transparent;
}

.heatmap-container::-webkit-scrollbar-thumb {
  background: rgb(203 213 225);
  border-radius: 10px;
}

.dark .heatmap-container::-webkit-scrollbar-thumb {
  background: rgb(71 85 105);
}
</style>
