<script setup lang="ts">
import type { PortfolioExposure, ExposureGap } from '~/lib/portfolio-exposure/exposure'
import type { BetaAllocationResult } from '~/lib/beta-allocation/policy'
import type { MarketState } from '~/lib/market-rotation/state'

interface Props {
  exposure: PortfolioExposure | null
  gaps: ExposureGap[]
  betaAllocation: BetaAllocationResult | null
  marketState: MarketState | null
  lastUpdated: Date | null
  pending?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  pending: false,
})

const { t } = useI18n()

// Current allocation bars (mapped from PortfolioExposure)
const currentBars = computed(() => {
  const ex = props.exposure
  if (!ex) {
    return [
      { key: 'highBeta', label: t('portfolioExposure.buckets.highBeta'), pct: 0 },
      { key: 'coreIndex', label: t('portfolioExposure.buckets.coreIndex'), pct: 0 },
      { key: 'cash', label: t('portfolioExposure.buckets.cash'), pct: 0 },
    ]
  }
  // highBeta = high_beta + mega_cap + single_stock (matches compareExposureToTarget)
  const highBeta = ex.highBetaPct + ex.megaCapPct + ex.singleStockPct
  const coreIndex = ex.coreIndexPct
  const cash = ex.defensivePct + ex.cashProxyPct
  return [
    { key: 'highBeta', label: t('portfolioExposure.buckets.highBeta'), pct: roundPct(highBeta) },
    { key: 'coreIndex', label: t('portfolioExposure.buckets.coreIndex'), pct: roundPct(coreIndex) },
    { key: 'cash', label: t('portfolioExposure.buckets.cash'), pct: roundPct(cash) },
  ]
})

// Suggested allocation bars
const suggestedBars = computed(() => {
  const beta = props.betaAllocation
  if (!beta) {
    return [
      { key: 'highBeta', label: t('portfolioExposure.buckets.highBeta'), pct: 0 },
      { key: 'coreIndex', label: t('portfolioExposure.buckets.coreIndex'), pct: 0 },
      { key: 'cash', label: t('portfolioExposure.buckets.cash'), pct: 0 },
    ]
  }
  return [
    { key: 'highBeta', label: t('portfolioExposure.buckets.highBeta'), pct: beta.highBetaTargetPct },
    { key: 'coreIndex', label: t('portfolioExposure.buckets.coreIndex'), pct: beta.coreIndexTargetPct },
    { key: 'cash', label: t('portfolioExposure.buckets.cash'), pct: beta.cashTargetPct },
  ]
})

const hasMarketData = computed(
  () => props.marketState !== null && props.marketState !== 'unknown',
)

const showOverweightWarning = computed(() =>
  props.gaps.some(g => g.bucket === 'highBeta' && g.status === 'overweight'),
)

const lastUpdatedLabel = computed(() => {
  if (!props.lastUpdated) return '--'
  return new Intl.DateTimeFormat('zh-Hant-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(props.lastUpdated)
})

function roundPct(value: number): number {
  return Math.round(value * 10) / 10
}

function statusTone(status: ExposureGap['status']): 'success' | 'neutral' | 'warning' {
  switch (status) {
    case 'balanced': return 'success'
    case 'underweight': return 'neutral'
    case 'overweight': return 'warning'
    default: return 'neutral'
  }
}

function barTone(key: string): string {
  switch (key) {
    case 'highBeta': return 'bg-dt-primary'
    case 'coreIndex': return 'bg-dt-info'
    case 'cash': return 'bg-dt-success'
    default: return 'bg-dt-border-strong'
  }
}

function formatGap(gap: ExposureGap): string {
  const sign = gap.gapPct > 0 ? '+' : ''
  return `${sign}${roundPct(gap.gapPct)}%`
}
</script>

<template>
  <LedgerCard class="portfolio-exposure-panel">
    <!-- Header -->
    <header class="mb-4 flex items-center justify-between gap-3 border-b border-dt-border pb-3">
      <div class="flex items-center gap-2">
        <Icon name="heroicons:chart-pie" class="h-5 w-5 text-dt-primary" />
        <h2 class="text-lg font-semibold text-dt-text">
          {{ t('portfolioExposure.title') }}
        </h2>
      </div>
      <span class="text-xs text-dt-text-muted">
        {{ t('portfolioExposure.lastUpdated') }}: {{ lastUpdatedLabel }}
      </span>
    </header>

    <!-- Pending state -->
    <div v-if="pending" class="py-6">
      <AppSkeleton variant="table-row" :count="3" />
    </div>

    <!-- Empty state: no holdings at all -->
    <div v-else-if="!exposure || exposure.totalValue === 0" class="py-6 text-center text-sm text-dt-text-muted">
      {{ t('portfolioExposure.empty') }}
    </div>

    <!-- Panel body -->
    <div v-else class="space-y-5">
      <!-- Current vs Suggested grid -->
      <div class="grid gap-5 lg:grid-cols-2">
        <!-- Current allocation -->
        <div>
          <div class="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ t('portfolioExposure.current') }}
          </div>
          <div class="space-y-2">
            <div
              v-for="bar in currentBars"
              :key="`c-${bar.key}`"
              class="grid grid-cols-[100px_1fr_44px] items-center gap-2"
            >
              <span class="text-xs text-dt-text-soft">{{ bar.label }}</span>
              <div class="h-2 overflow-hidden rounded-full bg-dt-surface-strong">
                <div
                  class="h-full rounded-full transition-all"
                  :class="barTone(bar.key)"
                  :style="{ width: `${Math.min(100, Math.max(0, bar.pct))}%` }"
                />
              </div>
              <span class="text-right font-mono text-xs text-dt-text tabular-nums">{{ bar.pct }}%</span>
            </div>
          </div>
        </div>

        <!-- Suggested allocation -->
        <div>
          <div class="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ t('portfolioExposure.suggested') }}
          </div>
          <div class="space-y-2">
            <div
              v-for="bar in suggestedBars"
              :key="`s-${bar.key}`"
              class="grid grid-cols-[100px_1fr_44px] items-center gap-2"
            >
              <span class="text-xs text-dt-text-soft">{{ bar.label }}</span>
              <div class="h-2 overflow-hidden rounded-full bg-dt-surface-strong">
                <div
                  class="h-full rounded-full transition-all"
                  :class="barTone(bar.key)"
                  :style="{ width: `${Math.min(100, Math.max(0, bar.pct))}%` }"
                />
              </div>
              <span class="text-right font-mono text-xs text-dt-text tabular-nums">{{ bar.pct }}%</span>
            </div>
          </div>
        </div>
      </div>

      <!-- No market data notice -->
      <div
        v-if="!hasMarketData"
        class="rounded-md border border-dt-border bg-dt-surface-strong px-3 py-2"
      >
        <p class="text-sm leading-5 text-dt-text-soft">
          {{ t('portfolioExposure.noMarketData') }}
        </p>
      </div>

      <!-- Status list + explanation -->
      <template v-else>
        <div v-if="gaps.length > 0">
          <div class="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ t('portfolioExposure.status') }}
          </div>
          <ul class="space-y-1.5">
            <li
              v-for="gap in gaps"
              :key="gap.bucket"
              class="flex items-center justify-between gap-3 border-b border-dt-border pb-1.5 text-sm last:border-b-0"
            >
              <span class="text-dt-text-soft">{{ t(`portfolioExposure.buckets.${gap.bucket}`) }}</span>
              <div class="flex items-center gap-3">
                <span class="font-mono text-xs text-dt-text-muted tabular-nums">
                  {{ roundPct(gap.currentPct) }}% / {{ gap.targetPct }}% ({{ formatGap(gap) }})
                </span>
                <StatusBadge :tone="statusTone(gap.status)">
                  {{ t(`portfolioExposure.statuses.${gap.status}`) }}
                </StatusBadge>
              </div>
            </li>
          </ul>
        </div>

        <!-- Overweight high-beta warning -->
        <div
          v-if="showOverweightWarning"
          class="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <p class="text-sm leading-5 text-amber-800 dark:text-amber-200">
            {{ t('portfolioExposure.overweightWarning') }}
          </p>
        </div>

        <!-- Skipped holdings warning (NaN / Infinity market data) -->
        <div
          v-if="exposure && exposure.skippedCount > 0"
          class="flex items-start gap-2 rounded-md border border-amber-300/60 bg-amber-50 px-3 py-2 dark:border-amber-500/30 dark:bg-amber-500/10"
        >
          <Icon name="heroicons:exclamation-circle" class="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-300" />
          <p class="text-sm leading-5 text-amber-800 dark:text-amber-200">
            {{ t('portfolioExposure.skippedWarning', { count: exposure.skippedCount }) }}
          </p>
        </div>

        <!-- Beta allocation explanation -->
        <div
          v-if="betaAllocation && betaAllocation.explanation"
          class="rounded-md border border-dt-border bg-dt-surface-strong px-3 py-2"
        >
          <div class="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ t('portfolioExposure.explanation') }}
          </div>
          <p class="text-sm leading-5 text-dt-text-soft">
            {{ betaAllocation.explanation }}
          </p>
        </div>
      </template>
    </div>
  </LedgerCard>
</template>
