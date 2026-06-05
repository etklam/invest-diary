<script setup lang="ts">
const props = defineProps<{
  up4: number | null
  down4: number | null
  up4Pct: number | null
  down4Pct: number | null
  ratio10d: number | null
  above40dPct: number | null
}>()

function formatNumber(value: number | null, decimals = 0) {
  return typeof value === 'number' && Number.isFinite(value) ? value.toFixed(decimals) : '--'
}

function formatPercent(value: number | null) {
  return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}%` : '--'
}

const metrics = computed(() => [
  {
    title: 'Up 4% Count',
    value: formatNumber(props.up4),
    detail: `${formatPercent(props.up4Pct)} of universe`,
    icon: 'heroicons:arrow-trending-up',
    tone: 'text-emerald-700 dark:text-emerald-300',
  },
  {
    title: 'Down 4% Count',
    value: formatNumber(props.down4),
    detail: `${formatPercent(props.down4Pct)} of universe`,
    icon: 'heroicons:arrow-trending-down',
    tone: 'text-rose-700 dark:text-rose-300',
  },
  {
    title: '10d Up / Down Ratio',
    value: formatNumber(props.ratio10d, 2),
    detail: 'Short-term breadth pressure',
    icon: 'heroicons:scale',
    tone: 'text-sky-700 dark:text-sky-300',
  },
  {
    title: 'Above 40d MA',
    value: formatPercent(props.above40dPct),
    detail: 'Intermediate trend participation',
    icon: 'heroicons:squares-plus',
    tone: 'text-indigo-700 dark:text-indigo-300',
  },
])
</script>

<template>
  <section class="grid gap-3 md:grid-cols-2">
    <article
      v-for="metric in metrics"
      :key="metric.title"
      class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900"
    >
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          {{ metric.title }}
        </h3>
        <Icon :name="metric.icon" class="h-5 w-5" :class="metric.tone" />
      </div>
      <p class="font-mono text-3xl font-black text-slate-950 dark:text-white">
        {{ metric.value }}
      </p>
      <p class="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {{ metric.detail }}
      </p>
    </article>
  </section>
</template>
