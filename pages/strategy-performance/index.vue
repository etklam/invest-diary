<template>
  <div class="mx-auto max-w-[1180px] space-y-6">
    <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
            {{ $t('strategyPerformance.kicker') }}
          </p>
          <h1 class="font-display mt-1 text-3xl tracking-tight text-dt-text">
            {{ $t('strategyPerformance.title') }}
          </h1>
          <p class="mt-2 max-w-2xl text-sm leading-relaxed text-dt-text-muted">
            {{ $t('strategyPerformance.description') }}
          </p>
        </div>
        <div class="flex rounded-dt-sm border border-dt-border bg-dt-surface-strong p-1">
          <button
            v-for="period in periodOptions"
            :key="period.value"
            type="button"
            class="rounded-dt-sm px-3 py-2 text-sm font-semibold transition"
            :class="selectedPeriod === period.value ? 'bg-dt-primary text-white' : 'text-dt-text-muted hover:text-dt-text'"
            @click="selectedPeriod = period.value"
          >
            {{ period.label }}
          </button>
        </div>
      </div>
    </section>

    <section v-if="pending" class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
      <AppSkeleton variant="card" :count="4" />
    </section>

    <section v-else-if="error" class="rounded-dt-md border border-dt-danger/30 bg-dt-surface p-5 text-dt-danger shadow-dt-md">
      <div class="flex flex-wrap items-center gap-3">
        <Icon name="heroicons:x-circle" class="h-5 w-5" />
        <div>
          <h2 class="font-display text-xl tracking-tight text-dt-text">{{ $t('strategyPerformance.loadFailed') }}</h2>
          <p class="mt-1 text-sm text-dt-text-muted">{{ error.message }}</p>
        </div>
        <BaseButton variant="secondary" class="ml-auto" @click="refresh()">
          {{ $t('common.retry') }}
        </BaseButton>
      </div>
    </section>

    <template v-else-if="hasClosedTrades && data">
      <section class="grid gap-4 md:grid-cols-4">
        <div class="metric-card">
          <span>{{ $t('strategyPerformance.totalPnl') }}</span>
          <strong :class="pnlClass(data.summary.totalRealizedPnL)">{{ formatMoney(data.summary.totalRealizedPnL) }}</strong>
        </div>
        <div class="metric-card">
          <span>{{ $t('strategyPerformance.winRate') }}</span>
          <strong>{{ formatPercent(data.summary.winRate) }}</strong>
        </div>
        <div class="metric-card">
          <span>{{ $t('strategyPerformance.bestStrategy') }}</span>
          <strong>{{ data.bestStrategy?.name || $t('strategyPerformance.none') }}</strong>
        </div>
        <div class="metric-card">
          <span>{{ $t('strategyPerformance.worstStrategy') }}</span>
          <strong>{{ data.worstStrategy?.name || $t('strategyPerformance.none') }}</strong>
        </div>
      </section>

      <section class="grid gap-6 lg:grid-cols-2">
        <PerformanceBreakdownTable
          :title="$t('strategyPerformance.strategyTable')"
          :empty-text="$t('strategyPerformance.emptyStrategy')"
          :items="data.strategyBreakdown"
        />
        <PerformanceBreakdownTable
          :title="$t('strategyPerformance.emotionTable')"
          :empty-text="$t('strategyPerformance.emptyEmotion')"
          :items="data.emotionBreakdown"
        />
      </section>
    </template>

    <section v-else class="rounded-dt-md border border-dt-border bg-dt-surface p-8 text-center shadow-dt-md">
      <Icon name="heroicons:chart-bar-square" class="mx-auto h-12 w-12 text-dt-text-soft" />
      <h2 class="font-display mt-4 text-2xl tracking-tight text-dt-text">{{ $t('strategyPerformance.emptyTitle') }}</h2>
      <p class="mx-auto mt-2 max-w-xl text-sm leading-6 text-dt-text-muted">
        {{ $t('strategyPerformance.emptyDescription') }}
      </p>
      <NuxtLink to="/diaries/new" class="mt-5 inline-flex">
        <BaseButton>{{ $t('strategyPerformance.recordTrade') }}</BaseButton>
      </NuxtLink>
    </section>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
})

type PerfPeriod = 'month' | 'quarter' | 'year'

interface PerformanceSummary {
  totalClosedTrades: number
  totalRealizedPnL: number
  winRate: number
}

interface BreakdownEntry {
  name: string
  tradeCount: number
  realizedPnL: number
  winRate: number
}

interface StrategyPerformanceResult {
  summary: PerformanceSummary
  strategyBreakdown: BreakdownEntry[]
  emotionBreakdown: BreakdownEntry[]
  bestStrategy: BreakdownEntry | null
  worstStrategy: BreakdownEntry | null
}

const { t } = useI18n()

const periodOptions = computed(() => [
  { value: 'month' as const, label: t('strategyPerformance.period.month') },
  { value: 'quarter' as const, label: t('strategyPerformance.period.quarter') },
  { value: 'year' as const, label: t('strategyPerformance.period.year') },
])
const selectedPeriod = ref<PerfPeriod>('month')

const { data, pending, error, refresh } = await useLazyFetch<StrategyPerformanceResult>('/api/stats/performance', {
  query: { period: selectedPeriod },
  default: () => ({
    summary: { totalClosedTrades: 0, totalRealizedPnL: 0, winRate: 0 },
    strategyBreakdown: [],
    emotionBreakdown: [],
    bestStrategy: null,
    worstStrategy: null,
  }),
})

const hasClosedTrades = computed(() => (data.value?.summary.totalClosedTrades ?? 0) > 0)

const formatMoney = (value: number) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

const formatPercent = (value: number) => `${value.toFixed(1)}%`
const pnlClass = (value: number) => value >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
</script>

<style scoped>
.metric-card {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  padding: 1.25rem;
  box-shadow: var(--shadow-sm);
}

.metric-card span {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: var(--color-text-soft);
}

.metric-card strong {
  display: block;
  margin-top: 0.55rem;
  overflow-wrap: anywhere;
  font-family: var(--font-data);
  font-size: 1.35rem;
  line-height: 1.2;
}
</style>
