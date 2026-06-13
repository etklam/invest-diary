<script setup lang="ts">
import type { MarketRotationMonitorRow } from '~/lib/market-rotation/monitor'
import type { MaStatus, RotationSignal } from '~/lib/market-rotation/signal'

const props = defineProps<{
  row: MarketRotationMonitorRow
}>()

const emit = defineEmits<{
  click: []
}>()

function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return value.toFixed(decimals)
}

function formatPercent(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(decimals)}%`
}

function changeColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'text-dt-text-muted'
  return value > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : value < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-dt-text-muted'
}

function rsiColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'text-dt-text-muted'
  if (value >= 50) return 'text-emerald-600 dark:text-emerald-400'
  if (value < 40) return 'text-red-600 dark:text-red-400'
  return 'text-dt-text-muted'
}

function signalTone(signal: RotationSignal | null): 'success' | 'warning' | 'danger' | 'neutral' | 'accent' {
  switch (signal) {
    case 'turning_strong':
      return 'accent'
    case 'early_recovery':
      return 'success'
    case 'strong_but_extended':
      return 'warning'
    case 'losing_momentum':
      return 'warning'
    case 'breaking_down':
      return 'danger'
    case 'neutral':
      return 'neutral'
    default:
      return 'neutral'
  }
}

function maStatusTone(status: MaStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'accent' {
  switch (status) {
    case 'bullish_stack':
      return 'success'
    case 'healthy_pullback':
      return 'accent'
    case 'recovering':
      return 'accent'
    case 'short_term_weakness':
      return 'warning'
    case 'breakdown':
      return 'danger'
    default:
      return 'neutral'
  }
}
</script>

<template>
  <article
    class="cursor-pointer rounded-xl border border-dt-border bg-dt-surface p-4 transition hover:bg-dt-bg"
    @click="emit('click')"
  >
    <!-- Header: symbol + name on left, rank on right -->
    <div class="flex items-start justify-between">
      <div>
        <p class="font-mono text-sm font-bold text-dt-text">{{ props.row.symbol }}</p>
        <p class="text-xs text-dt-text-muted">{{ props.row.sectorName ?? props.row.name }}</p>
      </div>
      <div class="text-right">
        <p class="text-xs text-dt-text-muted">RANK</p>
        <p class="font-mono text-lg font-black text-dt-text">{{ props.row.rotationRank != null ? `#${props.row.rotationRank}` : '--' }}</p>
      </div>
    </div>

    <!-- Price + Signal -->
    <div class="mt-3 flex items-center justify-between gap-2">
      <p data-testid="last-price" class="font-mono text-sm text-dt-text">{{ formatNumber(props.row.lastPrice) }}</p>
      <StatusBadge v-if="props.row.signal" :tone="signalTone(props.row.signal)">
        {{ props.row.signal.replaceAll('_', ' ') }}
      </StatusBadge>
    </div>

    <!-- Stats grid -->
    <div class="mt-3 grid grid-cols-4 gap-2 text-xs">
      <div>
        <p class="text-dt-text-muted">RSI</p>
        <p data-testid="rsi-value" class="font-mono font-semibold" :class="rsiColor(props.row.rsi14)">{{ formatNumber(props.row.rsi14, 1) }}</p>
      </div>
      <div>
        <p class="text-dt-text-muted">RSI &Delta;</p>
        <p data-testid="rsi-delta" class="font-mono font-semibold" :class="changeColor(props.row.rsiDelta2W)">
          {{ formatPercent(props.row.rsiDelta2W, 1) }}
        </p>
      </div>
      <div>
        <p class="text-dt-text-muted">2W%</p>
        <p data-testid="2w-perf" class="font-mono font-semibold" :class="changeColor(props.row.twoWeekPerformancePct)">
          {{ formatPercent(props.row.twoWeekPerformancePct) }}
        </p>
      </div>
      <div>
        <p class="text-dt-text-muted">% HI</p>
        <p data-testid="pct-high" class="font-mono font-semibold" :class="changeColor(props.row.percentFromHigh)">
          {{ formatPercent(props.row.percentFromHigh) }}
        </p>
      </div>
    </div>

    <!-- MA status -->
    <div class="mt-3 flex items-center gap-2">
      <StatusBadge :tone="maStatusTone(props.row.maStatus)">
        {{ props.row.maStatus.replaceAll('_', ' ') }}
      </StatusBadge>
      <span class="text-xs text-dt-text-muted">{{ props.row.above50d === true ? 'Above 50d' : props.row.above50d === false ? 'Below 50d' : '50d N/A' }}</span>
    </div>
  </article>
</template>
