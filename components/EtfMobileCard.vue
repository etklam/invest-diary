<script setup lang="ts">
import type { MarketRotationMonitorRow } from '~/lib/market-rotation/monitor'
import type { MaStatus, RotationSignal } from '~/lib/market-rotation/signal'
import { formatNumber, formatSignedPercent } from '~/lib/format'

const props = defineProps<{
  row: MarketRotationMonitorRow
}>()

const emit = defineEmits<{
  click: []
}>()
const { t } = useI18n()

function changeColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'text-dt-text-muted'
  return value > 0
    ? 'text-dt-success'
    : value < 0
      ? 'text-dt-danger'
      : 'text-dt-text-muted'
}

function rsiColor(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return 'text-dt-text-muted'
  if (value >= 50) return 'text-dt-success'
  if (value < 40) return 'text-dt-danger'
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

function signalLabel(signal: RotationSignal | null): string {
  return signal ? t(`marketRotation.signals.${signal}`) : t('marketRotation.common.notAvailable')
}

function maStatusLabel(status: MaStatus): string {
  return t(`marketRotation.maStatuses.${status}`)
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
        <p class="text-xs text-dt-text-muted">{{ t('marketRotation.columns.rank') }}</p>
        <p class="font-mono text-lg font-black text-dt-text">{{ props.row.rotationRank != null ? `#${props.row.rotationRank}` : t('marketRotation.common.notAvailable') }}</p>
      </div>
    </div>

    <!-- Price + Signal -->
    <div class="mt-3 flex items-center justify-between gap-2">
      <p data-testid="last-price" class="font-mono text-sm text-dt-text">{{ props.row.lastPrice != null && Number.isFinite(props.row.lastPrice) ? formatNumber(props.row.lastPrice) : t('marketRotation.common.notAvailable') }}</p>
      <StatusBadge v-if="props.row.signal" :tone="signalTone(props.row.signal)">
        {{ signalLabel(props.row.signal) }}
      </StatusBadge>
    </div>

    <!-- Stats grid -->
    <div class="mt-3 grid grid-cols-4 gap-2 text-xs">
      <div>
        <p class="text-dt-text-muted">{{ t('marketRotation.columns.rsi') }}</p>
        <p data-testid="rsi-value" class="font-mono font-semibold" :class="rsiColor(props.row.rsi14)">{{ props.row.rsi14 != null && Number.isFinite(props.row.rsi14) ? formatNumber(props.row.rsi14) : t('marketRotation.common.notAvailable') }}</p>
      </div>
      <div>
        <p class="text-dt-text-muted">{{ t('marketRotation.columns.rsiDelta2W') }}</p>
        <p data-testid="rsi-delta" class="font-mono font-semibold" :class="changeColor(props.row.rsiDelta2W)">
          {{ props.row.rsiDelta2W != null && Number.isFinite(props.row.rsiDelta2W) ? formatSignedPercent(props.row.rsiDelta2W, 1).replace('%', ' pts') : t('marketRotation.common.notAvailable') }}
        </p>
      </div>
      <div>
        <p class="text-dt-text-muted">{{ t('marketRotation.columns.performance2W') }}</p>
        <p data-testid="2w-perf" class="font-mono font-semibold" :class="changeColor(props.row.twoWeekPerformancePct)">
          {{ props.row.twoWeekPerformancePct != null && Number.isFinite(props.row.twoWeekPerformancePct) ? formatSignedPercent(props.row.twoWeekPerformancePct) : t('marketRotation.common.notAvailable') }}
        </p>
      </div>
      <div>
        <p class="text-dt-text-muted">{{ t('marketRotation.columns.fromHigh') }}</p>
        <p data-testid="pct-high" class="font-mono font-semibold" :class="changeColor(props.row.percentFromHigh)">
          {{ props.row.percentFromHigh != null && Number.isFinite(props.row.percentFromHigh) ? formatSignedPercent(props.row.percentFromHigh) : t('marketRotation.common.notAvailable') }}
        </p>
      </div>
    </div>

    <!-- MA status -->
    <div class="mt-3 flex items-center gap-2">
      <StatusBadge :tone="maStatusTone(props.row.maStatus)">
        {{ maStatusLabel(props.row.maStatus) }}
      </StatusBadge>
      <span class="text-xs text-dt-text-muted">{{ props.row.above50d === true ? t('marketRotation.filters.above_50d') : props.row.above50d === false ? t('marketRotation.filters.below_50d') : t('marketRotation.common.na') }}</span>
    </div>
  </article>
</template>
