<template>
  <div class="calendar-page mx-auto max-w-[1080px] space-y-6">
    <!-- Header -->
    <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-sm sm:p-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="min-w-0">
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ t('calendar.intelligence') }}
          </p>
          <h1 class="font-display mt-1.5 text-[clamp(1.75rem,4vw,2.5rem)] leading-tight tracking-tight text-dt-text">
            {{ monthTitle }}
          </h1>
        </div>
        <div class="flex items-center gap-2">
          <BaseButton
            variant="secondary"
            class="!min-h-11 !w-11 !px-0 text-dt-text"
            :aria-label="t('common.previous')"
            @click="previousMonth"
          >
            <span class="text-xl leading-none" aria-hidden="true">‹</span>
          </BaseButton>
          <BaseButton
            variant="secondary"
            class="!min-h-11 !w-11 !px-0 text-dt-text"
            :aria-label="t('common.next')"
            @click="nextMonth"
          >
            <span class="text-xl leading-none" aria-hidden="true">›</span>
          </BaseButton>
        </div>
      </div>

      <div class="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <article class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
            {{ t('calendar.daysInMonth') }}
          </p>
          <p class="font-data mt-2 text-2xl font-semibold tabular-nums text-dt-text">
            {{ daysInMonth }}
          </p>
        </article>
        <article class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
            {{ t('calendar.diaryCount') }}
          </p>
          <p class="font-data mt-2 text-2xl font-semibold tabular-nums text-dt-primary">
            {{ monthDiaryCount }}
          </p>
        </article>
        <article class="rounded-dt-sm border border-dt-border bg-dt-surface-strong p-4">
          <p class="text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-text-soft">
            {{ t('calendar.coverage') }}
          </p>
          <div class="mt-2 flex items-baseline gap-2">
            <p class="font-data text-2xl font-semibold tabular-nums text-dt-text">
              {{ monthCoverage }}
            </p>
            <span class="text-xs text-dt-text-soft">{{ t('calendar.excludeHolidays') }}</span>
          </div>
        </article>
      </div>
    </section>

    <!-- Month grid -->
    <section class="overflow-hidden rounded-dt-md border border-dt-border bg-dt-surface shadow-dt-sm">
      <div class="grid grid-cols-7 gap-px bg-dt-border">
        <div
          v-for="day in weekDays"
          :key="day"
          class="bg-dt-surface-strong py-3 text-center text-[11px] font-semibold uppercase tracking-[0.12em] text-dt-text-soft"
        >
          {{ day }}
        </div>

        <div
          v-for="n in firstDayOfWeek"
          :key="'blank-' + n"
          class="min-h-[5.5rem] bg-dt-bg sm:min-h-[7rem]"
        />

        <button
          v-for="day in daysInMonth"
          :key="day"
          type="button"
          class="day-cell group relative min-h-[5.5rem] bg-dt-surface p-2.5 text-left transition-colors duration-150 hover:bg-dt-surface-strong sm:min-h-[7rem] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dt-primary/40"
          :class="{
            'is-today': isToday(day),
            'has-diary': hasDiary(day),
            'is-holiday': isExcludedHoliday(day),
          }"
          @click="handleDateClick(day)"
        >
          <span
            class="inline-flex h-7 min-w-7 items-center justify-center rounded-md text-sm font-semibold tabular-nums"
            :class="isToday(day)
              ? 'bg-dt-primary-solid text-white'
              : 'text-dt-text-muted group-hover:text-dt-text'"
          >
            {{ day }}
          </span>

          <div v-if="hasDiary(day)" class="mt-1.5 pr-1">
            <div class="line-clamp-2 text-[11px] leading-snug text-dt-text-muted group-hover:text-dt-text sm:text-xs">
              {{ t('calendar.recorded') }}
            </div>
            <div class="absolute bottom-2.5 right-2.5 flex gap-1">
              <span
                class="h-1.5 w-1.5 rounded-full bg-dt-primary-solid"
                :title="t('nav.diaries')"
              />
              <span
                v-if="getActivityForDay(day)?.alertCount"
                class="h-1.5 w-1.5 rounded-full bg-dt-warning"
                :title="t('nav.alerts')"
              />
              <span
                v-if="getActivityForDay(day)?.transactionCount"
                class="h-1.5 w-1.5 rounded-full bg-dt-success"
                :title="t('stock.dashboard.quickTransaction')"
              />
            </div>
          </div>

          <div
            v-if="isExcludedHoliday(day)"
            class="pointer-events-none absolute inset-0 opacity-[0.04]"
            style="background-image: repeating-linear-gradient(-45deg, currentColor, currentColor 1px, transparent 1px, transparent 8px);"
          />
        </button>
      </div>
    </section>

    <!-- Heatmap -->
    <LedgerCard :title="t('calendar.activityHeatmap')">
      <div class="mb-4 flex flex-wrap items-center justify-end gap-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-dt-text-soft">
        <div class="flex items-center gap-1.5">
          <div class="h-2.5 w-2.5 rounded-sm bg-dt-surface-muted" />
          <span>{{ t('calendar.notRecorded') }}</span>
        </div>
        <div class="flex items-center gap-1.5">
          <div class="h-2.5 w-2.5 rounded-sm bg-dt-primary-solid" />
          <span>{{ t('calendar.recorded') }}</span>
        </div>
      </div>

      <div class="heatmap-container overflow-x-auto pb-1">
        <div class="flex min-w-max gap-1">
          <div
            v-for="(week, weekIndex) in heatmapDays"
            :key="`week-${weekIndex}`"
            class="flex flex-col gap-1"
          >
            <div
              v-for="(cell, dayIndex) in week"
              :key="`cell-${weekIndex}-${dayIndex}`"
              class="h-3 w-3 rounded-[3px]"
              :class="{
                'bg-transparent': !cell,
                'bg-dt-surface-muted': cell && cell.level === 0 && !cell.excluded,
                'bg-dt-primary-solid': cell && cell.level === 1,
                'bg-dt-border opacity-60': cell && cell.excluded,
              }"
              :title="cell
                ? `${cell.dateKey}: ${cell.level === 1 ? t('calendar.recorded') : t('calendar.notRecorded')}${cell.excluded ? ` (${t('calendar.holiday')})` : ''}`
                : ''"
            />
          </div>
        </div>
      </div>
    </LedgerCard>

    <div class="flex flex-col justify-center gap-3 sm:flex-row">
      <BaseButton variant="primary" @click="openQuickDiary()">
        <Icon name="heroicons:bolt" class="mr-2 h-5 w-5" />
        {{ t('calendar.quickDiary') }}
      </BaseButton>
      <BaseButton variant="secondary" @click="goToToday">
        {{ t('calendar.backToToday') }}
      </BaseButton>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useCalendar } from '~/composables/useCalendar'
import { useDiaryMutation } from '~/composables/useDiaryMutation'
import { useAppShell } from '~/composables/useAppShell'
import { useI18n } from '#imports'
import { formatUserDateTime } from '~/lib/dates'
import { resolveUserTimezone } from '~/lib/dates/user-tz'

definePageMeta({
  middleware: 'auth'
})

const { t, locale } = useI18n()
const { user } = useAuth()

const {
  currentYear,
  currentMonth,
  weekDays,
  daysInMonth,
  firstDayOfWeek,
  monthDiaryCount,
  monthCoverage,
  heatmapDays,
  fetchActivity,
  previousMonth,
  nextMonth,
  goToToday,
  hasDiary,
  getActivityForDay,
  isToday,
  isExcludedHoliday
} = useCalendar()

const monthTitle = computed(() =>
  formatUserDateTime(new Date(Date.UTC(currentYear.value, currentMonth.value, 1, 12)), {
    timezone: resolveUserTimezone(user.value),
    locale: locale.value || 'en',
    format: { month: 'long', year: 'numeric' },
  }),
)

const { openQuickDiary: openGlobalQuickDiary } = useAppShell()
const openQuickDiary = (date?: string) => {
  openGlobalQuickDiary({
    source: 'calendar',
    ...(date ? { date } : {}),
  })
}

const handleDateClick = (day: number) => {
  const dateStr = `${currentYear.value}-${String(currentMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
  const activity = getActivityForDay(day)

  if (activity) {
    navigateTo(`/diaries/${activity.diaryId}`)
  } else {
    openQuickDiary(dateStr)
  }
}

const { onDiaryMutation } = useDiaryMutation()
onDiaryMutation(() => {
  fetchActivity()
})
</script>

<style scoped>
.day-cell.is-today {
  background: color-mix(in srgb, var(--color-primary) 8%, var(--color-surface));
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--color-primary) 28%, transparent);
}

.day-cell.is-holiday:not(.is-today) {
  background: var(--color-background);
}

.day-cell.has-diary:not(.is-today) {
  background: color-mix(in srgb, var(--color-surface-strong) 70%, var(--color-surface));
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
  background: var(--color-border-strong);
  border-radius: 999px;
}
</style>
