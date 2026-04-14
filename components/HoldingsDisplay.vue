<template>
  <BaseCard class="!p-0 overflow-hidden">
    <div class="px-6 py-4 border-b border-line bg-surface-alt">
      <h3 class="text-sm font-semibold text-copy uppercase tracking-widest">當前持股</h3>
      <p class="mt-1 text-xs text-copy-muted">根據所有交易記錄計算（平均成本法）</p>
    </div>

    <!-- Desktop Table -->
    <div class="hidden md:block overflow-x-auto">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="text-[10px] font-semibold uppercase tracking-widest text-copy-muted bg-surface-alt border-b border-line">
            <th class="px-6 py-3">代碼</th>
            <th class="px-6 py-3 text-right">數量</th>
            <th class="px-6 py-3 text-right">平均成本</th>
            <th class="px-6 py-3 text-right">總成本</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-line">
          <tr v-for="holding in holdings" :key="holding.symbol" class="hover:bg-surface-alt transition-colors">
            <td class="px-6 py-4 text-sm font-semibold text-accent">{{ holding.symbol }}</td>
            <td class="px-6 py-4 text-sm text-copy-secondary text-right font-mono tabular-nums">{{ holding.quantity.toFixed(4) }}</td>
            <td class="px-6 py-4 text-sm text-copy-secondary text-right font-mono tabular-nums">{{ holding.avgCost.toFixed(2) }}</td>
            <td class="px-6 py-4 text-sm text-copy-secondary text-right font-mono tabular-nums">{{ holding.totalCost.toFixed(2) }}</td>
          </tr>
          <tr v-if="holdings.length === 0">
            <td colspan="4" class="px-6 py-8 text-sm text-copy-muted text-center">
              目前無持股
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Mobile Card Layout -->
    <div class="md:hidden space-y-3 p-4">
      <div v-if="holdings.length === 0" class="text-center py-6">
        <p class="text-sm text-copy-muted">目前無持股</p>
      </div>

      <div
        v-for="holding in holdings"
        :key="holding.symbol"
        class="bg-surface-alt border border-line p-4"
      >
        <h4 class="text-sm font-semibold text-accent mb-3">{{ holding.symbol }}</h4>
        <div class="space-y-2 text-sm">
          <div class="flex justify-between">
            <span class="text-copy-muted">數量</span>
            <span class="font-medium text-copy font-mono tabular-nums">{{ holding.quantity.toFixed(4) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-copy-muted">平均成本</span>
            <span class="font-medium text-copy font-mono tabular-nums">{{ holding.avgCost.toFixed(2) }}</span>
          </div>
          <div class="flex justify-between">
            <span class="text-copy-muted">總成本</span>
            <span class="font-medium text-copy font-mono tabular-nums">{{ holding.totalCost.toFixed(2) }}</span>
          </div>
        </div>
      </div>
    </div>
  </BaseCard>
</template>

<script setup lang="ts">
import { calculateHoldings, type TransactionForHolding } from '~/lib/utils'

const props = defineProps<{
  transactions: TransactionForHolding[]
}>()

const holdings = computed(() => {
  // Use the centralized average cost calculation from lib/utils.ts
  return calculateHoldings(props.transactions || [])
})
</script>
