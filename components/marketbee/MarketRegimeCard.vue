<script setup lang="ts">
const props = defineProps<{
  regime: string
  score: number | null
  suggestedExposure: string
  date: string
  isStale: boolean
}>()

const regimeLabel = computed(() => props.regime.replaceAll('_', ' '))

const scoreValue = computed(() => {
  if (typeof props.score !== 'number' || !Number.isFinite(props.score)) return null
  return Math.min(100, Math.max(0, props.score))
})

const scoreLabel = computed(() => scoreValue.value === null ? '--' : `${scoreValue.value.toFixed(0)} / 100`)

const formattedDate = computed(() => {
  if (!props.date) return '--'
  const date = new Date(props.date)
  if (Number.isNaN(date.getTime())) return props.date
  return new Intl.DateTimeFormat('en-GB', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(date)
})

const badgeClass = computed(() => {
  if (props.regime === 'BULLISH_THRUST') {
    return 'border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-400/15 dark:text-emerald-200'
  }
  if (props.regime === 'RISK_ON') {
    return 'border-green-200 bg-green-100 text-green-800 dark:border-green-400/20 dark:bg-green-400/15 dark:text-green-200'
  }
  if (props.regime === 'NEUTRAL') {
    return 'border-amber-200 bg-amber-100 text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/15 dark:text-amber-200'
  }
  if (props.regime === 'RISK_OFF') {
    return 'border-orange-200 bg-orange-100 text-orange-800 dark:border-orange-400/20 dark:bg-orange-400/15 dark:text-orange-200'
  }
  if (props.regime === 'CAPITULATION_WATCH') {
    return 'border-red-200 bg-red-100 text-red-800 dark:border-red-400/20 dark:bg-red-400/15 dark:text-red-200'
  }
  return 'border-slate-200 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-300'
})

const progressClass = computed(() => {
  if (props.regime === 'BULLISH_THRUST' || props.regime === 'RISK_ON') return 'bg-emerald-500'
  if (props.regime === 'NEUTRAL') return 'bg-amber-500'
  if (props.regime === 'RISK_OFF') return 'bg-orange-500'
  if (props.regime === 'CAPITULATION_WATCH') return 'bg-red-500'
  return 'bg-slate-500'
})
</script>

<template>
  <section class="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
    <div class="grid gap-5 p-5 lg:grid-cols-[1fr_280px] lg:p-6">
      <div class="min-w-0">
        <div class="mb-4 flex flex-wrap items-center gap-2">
          <span class="inline-flex items-center rounded-full border px-3 py-1 text-xs font-black uppercase tracking-[0.08em]" :class="badgeClass">
            {{ regimeLabel }}
          </span>
          <span
            v-if="isStale"
            class="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200"
          >
            <Icon name="heroicons:exclamation-triangle" class="h-4 w-4" />
            Stale
          </span>
        </div>

        <h2 class="text-2xl font-black text-slate-950 dark:text-white sm:text-3xl">
          Marketbee Regime Monitor
        </h2>
        <p class="mt-2 max-w-3xl text-sm leading-6 text-slate-500 dark:text-slate-400">
          Current breadth regime and beta exposure posture for the ETF board.
        </p>
      </div>

      <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
        <p class="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          Suggested Exposure
        </p>
        <p class="mt-1 text-3xl font-black text-slate-950 dark:text-white">
          {{ suggestedExposure || '--' }}
        </p>
        <p class="mt-2 text-xs text-slate-500 dark:text-slate-400">
          Last update: {{ formattedDate }}
        </p>
      </div>
    </div>

    <div class="border-t border-slate-200 px-5 py-4 dark:border-white/10 lg:px-6">
      <div class="mb-2 flex items-center justify-between gap-3">
        <span class="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Regime Score</span>
        <span class="font-mono text-sm font-black text-slate-950 dark:text-white">{{ scoreLabel }}</span>
      </div>
      <div class="h-3 overflow-hidden rounded-full bg-slate-200 dark:bg-white/10">
        <div
          class="h-full rounded-full transition-all"
          :class="progressClass"
          :style="{ width: `${scoreValue ?? 0}%` }"
        />
      </div>
    </div>
  </section>
</template>
