<script setup lang="ts">
import type { BetaAllocationResult, BetaMode } from '~/lib/beta-allocation/policy'
import type { MarketState } from '~/lib/market-rotation/state'

const props = defineProps<{
  betaAllocation: BetaAllocationResult | null
  marketState: MarketState | null
  lastUpdated: Date | null
}>()

const { t } = useI18n()

// --- i18n-driven labels ---

const title = computed(() => t('betaCockpit.title'))
const marketStateLabel = computed(() =>
  props.marketState ? t(`betaCockpit.marketStates.${props.marketState}`) : '--',
)
const modeLabel = computed(() =>
  props.betaAllocation ? t(`betaCockpit.modes.${props.betaAllocation.suggestedMode}`) : '--',
)
const betaLevelLabel = computed(() => {
  if (!props.betaAllocation) return '--'
  const level = props.betaAllocation.suggestedBetaLevel
  return level == null ? '--' : `${level.toFixed(2)}x`
})

const lastUpdatedLabel = computed(() => {
  if (!props.lastUpdated) return '--'
  return new Intl.DateTimeFormat('zh-Hant-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(props.lastUpdated)
})

// --- Allocation bars ---

const allocationBars = computed(() => {
  const beta = props.betaAllocation
  if (!beta) {
    return [
      { key: 'highBeta', label: t('betaCockpit.highBeta'), pct: 0 },
      { key: 'coreIndex', label: t('betaCockpit.coreIndex'), pct: 0 },
      { key: 'cash', label: t('betaCockpit.cash'), pct: 0 },
    ]
  }
  return [
    { key: 'highBeta', label: t('betaCockpit.highBeta'), pct: beta.highBetaTargetPct },
    { key: 'coreIndex', label: t('betaCockpit.coreIndex'), pct: beta.coreIndexTargetPct },
    { key: 'cash', label: t('betaCockpit.cash'), pct: beta.cashTargetPct },
  ]
})

const warnings = computed(() => props.betaAllocation?.warnings ?? [])

// --- Tones for mode / market state badges ---

function modeTone(mode: BetaMode | undefined): 'success' | 'neutral' | 'warning' | 'danger' | 'accent' {
  switch (mode) {
    case 'aggressive': return 'success'
    case 'balanced': return 'accent'
    case 'defensive': return 'warning'
    case 'capital_preservation': return 'danger'
    default: return 'neutral'
  }
}

function marketStateTone(state: MarketState | null): 'success' | 'neutral' | 'warning' | 'danger' {
  switch (state) {
    case 'risk_on': return 'success'
    case 'neutral': return 'neutral'
    case 'defensive': return 'warning'
    case 'risk_off': return 'danger'
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
</script>

<template>
  <LedgerCard class="beta-cockpit-card">
    <!-- Header -->
    <header class="mb-4 flex items-center justify-between gap-3 border-b border-dt-border pb-3">
      <div class="flex items-center gap-2">
        <Icon name="heroicons:adjustments-horizontal" class="h-5 w-5 text-dt-primary" />
        <h2 class="text-lg font-semibold text-dt-text">
          {{ title }}
        </h2>
      </div>
      <span class="text-xs text-dt-text-muted">
        {{ t('betaCockpit.lastUpdated') }}: {{ lastUpdatedLabel }}
      </span>
    </header>

    <!-- Empty state -->
    <div v-if="!betaAllocation" class="py-6 text-center text-sm text-dt-text-muted">
      --
    </div>

    <!-- Cockpit body -->
    <div v-else class="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <!-- Left column: state + mode + level -->
      <div class="space-y-3">
        <div class="flex items-center justify-between gap-3 border-b border-dt-border pb-2 text-sm">
          <span class="text-dt-text-muted">{{ t('betaCockpit.marketState') }}</span>
          <StatusBadge :tone="marketStateTone(marketState)">
            {{ marketStateLabel }}
          </StatusBadge>
        </div>
        <div class="flex items-center justify-between gap-3 border-b border-dt-border pb-2 text-sm">
          <span class="text-dt-text-muted">{{ t('betaCockpit.suggestedMode') }}</span>
          <StatusBadge :tone="modeTone(betaAllocation.suggestedMode)">
            {{ modeLabel }}
          </StatusBadge>
        </div>
        <div class="flex items-center justify-between gap-3 text-sm">
          <span class="text-dt-text-muted">{{ t('betaCockpit.suggestedBetaLevel') }}</span>
          <strong class="font-mono text-dt-text">{{ betaLevelLabel }}</strong>
        </div>
      </div>

      <!-- Right column: allocation bars + warnings + explanation -->
      <div class="space-y-4">
        <!-- Allocation bars -->
        <div>
          <div class="mb-2 text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ t('betaCockpit.suggestedAllocation') }}
          </div>
          <div class="space-y-2">
            <div v-for="bar in allocationBars" :key="bar.key" class="grid grid-cols-[100px_1fr_40px] items-center gap-2">
              <span class="text-xs text-dt-text-soft">{{ bar.label }}</span>
              <div class="h-2 overflow-hidden rounded-full bg-dt-surface-strong">
                <div
                  class="h-full rounded-full transition-all"
                  :class="barTone(bar.key)"
                  :style="{ width: `${bar.pct}%` }"
                />
              </div>
              <span class="text-right font-mono text-xs text-dt-text">{{ bar.pct }}%</span>
            </div>
          </div>
        </div>

        <!-- Explanation -->
        <div v-if="betaAllocation.explanation" class="rounded-md border border-dt-border bg-dt-surface-strong px-3 py-2">
          <div class="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ t('betaCockpit.explanation') }}
          </div>
          <p class="text-sm leading-5 text-dt-text-soft">
            {{ betaAllocation.explanation }}
          </p>
        </div>

        <!-- Warnings -->
        <div v-if="warnings.length > 0">
          <div class="mb-1 text-xs font-semibold uppercase tracking-[0.08em] text-dt-text-muted">
            {{ t('betaCockpit.warnings') }}
          </div>
          <ul class="space-y-1">
            <li
              v-for="(warning, idx) in warnings"
              :key="idx"
              class="flex items-start gap-2 text-xs text-amber-700 dark:text-amber-300"
            >
              <Icon name="heroicons:exclamation-triangle" class="mt-0.5 h-3 w-3 shrink-0" />
              <span>{{ warning }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  </LedgerCard>
</template>
