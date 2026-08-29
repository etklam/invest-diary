<template>
  <section class="rounded-dt-md border border-dt-border bg-dt-surface p-5 shadow-dt-md">
    <h2 class="font-display text-xl tracking-tight text-dt-text">{{ title }}</h2>
    <div v-if="items.length" class="mt-4 overflow-x-auto">
      <table class="min-w-full divide-y divide-dt-border text-sm">
        <thead>
          <tr class="text-left text-xs font-bold uppercase tracking-[0.12em] text-dt-text-soft">
            <th class="py-3 pr-4">{{ $t('strategyPerformance.columns.name') }}</th>
            <th class="py-3 pr-4 text-right">{{ $t('strategyPerformance.columns.trades') }}</th>
            <th class="py-3 pr-4 text-right">{{ $t('strategyPerformance.columns.pnl') }}</th>
            <th class="py-3 text-right">{{ $t('strategyPerformance.columns.winRate') }}</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-dt-border">
          <tr v-for="item in items" :key="item.name">
            <td class="max-w-[220px] py-3 pr-4 font-semibold text-dt-text">
              <span class="block break-words">{{ item.name }}</span>
            </td>
            <td class="py-3 pr-4 text-right font-data text-dt-text-muted">{{ item.tradeCount }}</td>
            <td class="py-3 pr-4 text-right font-data font-semibold" :class="pnlClass(item.realizedPnL)">
              {{ formatMoney(item.realizedPnL) }}
            </td>
            <td class="py-3 text-right font-data text-dt-text-muted">{{ formatPercent(item.winRate) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-else class="mt-4 rounded-dt-sm border border-dt-border bg-dt-surface-muted p-4 text-sm text-dt-text-muted">
      {{ emptyText }}
    </p>
  </section>
</template>

<script setup lang="ts">
interface BreakdownEntry {
  name: string
  tradeCount: number
  realizedPnL: number
  winRate: number
}

defineProps<{
  title: string
  emptyText: string
  items: BreakdownEntry[]
}>()

const formatMoney = (value: number) => {
  const sign = value > 0 ? '+' : ''
  return `${sign}${value.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
}

const formatPercent = (value: number) => `${value.toFixed(1)}%`
const pnlClass = (value: number) => value >= 0 ? 'text-dt-success' : 'text-dt-danger'
</script>
