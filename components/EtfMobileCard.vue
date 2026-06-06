<script setup lang="ts">
import type { SectorTrendRow } from '~/lib/etf-sector-trend'

const props = defineProps<{
  row: SectorTrendRow
}>()

const emit = defineEmits<{
  click: []
}>()

function formatNumber(value: number | null | undefined, decimals = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  return value.toFixed(decimals)
}

function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '--'
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function changeColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'text-dt-text-muted'
  return value > 0
    ? 'text-emerald-600 dark:text-emerald-400'
    : value < 0
      ? 'text-red-600 dark:text-red-400'
      : 'text-dt-text-muted'
}

function maStatusColor(status: 'ABOVE' | 'BELOW' | null): string {
  if (status === 'ABOVE') return 'text-emerald-500'
  if (status === 'BELOW') return 'text-red-500'
  return 'text-dt-text-muted'
}
</script>

<template>
  <article
    class="cursor-pointer rounded-xl border border-dt-border bg-dt-surface p-4 transition hover:bg-dt-bg"
    @click="emit('click')"
  >
    <div class="flex items-start justify-between">
      <div>
        <p class="font-mono text-sm font-bold text-dt-text">{{ props.row.symbol }}</p>
        <p class="text-xs text-dt-text-muted">{{ props.row.sector }}</p>
      </div>
      <p data-testid="last-price" class="font-mono text-sm text-dt-text">{{ formatNumber(props.row.last) }}</p>
    </div>

    <div class="mt-3 grid grid-cols-3 gap-2 text-xs">
      <div>
        <p class="text-dt-text-muted">1D</p>
        <p data-testid="daily-change" class="font-mono font-semibold" :class="changeColor(props.row.dailyChange)">
          {{ formatPercent(props.row.dailyChange) }}
        </p>
      </div>
      <div>
        <p class="text-dt-text-muted">RSI</p>
        <p data-testid="rsi-value" class="font-mono font-semibold text-dt-text">{{ formatNumber(props.row.rsi, 1) }}</p>
      </div>
      <div>
        <p class="text-dt-text-muted">MA</p>
        <div class="flex gap-1">
          <span data-testid="ma-ema10" class="font-mono" :class="maStatusColor(props.row.ema10Status)">10</span>
          <span data-testid="ma-ema20" class="font-mono" :class="maStatusColor(props.row.ema20Status)">20</span>
        </div>
      </div>
    </div>
  </article>
</template>
