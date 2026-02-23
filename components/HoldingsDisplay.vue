<template>
  <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
    <div class="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
      <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
        當前持股
      </h3>
      <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
        根據所有交易記錄計算 (FIFO)
      </p>
    </div>
    <div>
      <!-- Desktop Table -->
      <div class="hidden md:block overflow-x-auto">
        <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">代碼</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">數量</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">平均成本</th>
              <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">總成本</th>
            </tr>
          </thead>
          <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
            <tr v-for="holding in holdings" :key="holding.symbol">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{{ holding.symbol }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{{ holding.quantity.toFixed(4) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{{ holding.avgCost.toFixed(2) }}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{{ holding.totalCost.toFixed(2) }}</td>
            </tr>
            <tr v-if="holdings.length === 0">
              <td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                目前無持股
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Mobile Card Layout -->
      <div class="md:hidden space-y-3 px-4 py-4">
        <div v-if="holdings.length === 0" class="text-center py-6">
          <p class="text-sm text-gray-500 dark:text-gray-400">目前無持股</p>
        </div>

        <div
          v-for="holding in holdings"
          :key="holding.symbol"
          class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3"
        >
          <h4 class="text-base font-semibold text-indigo-600 dark:text-indigo-400 mb-2">
            {{ holding.symbol }}
          </h4>
          <div class="space-y-1.5 text-sm">
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">數量</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ holding.quantity.toFixed(4) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">平均成本</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ holding.avgCost.toFixed(2) }}
              </span>
            </div>
            <div class="flex justify-between">
              <span class="text-gray-500 dark:text-gray-400">總成本</span>
              <span class="font-medium text-gray-900 dark:text-white">
                {{ holding.totalCost.toFixed(2) }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { calculateHoldings, type Holding, type TransactionForHolding } from '~/lib/utils'

const props = defineProps<{
  transactions: TransactionForHolding[]
}>()

const holdings = computed(() => {
  // Use the centralized FIFO calculation from lib/utils.ts
  return calculateHoldings(props.transactions || [])
})
</script>
