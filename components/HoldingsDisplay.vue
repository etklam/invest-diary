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
    <div class="overflow-x-auto">
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
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{{ holding.quantity }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{{ holding.averagePrice.toFixed(2) }}</td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">{{ (holding.quantity * holding.averagePrice).toFixed(2) }}</td>
          </tr>
          <tr v-if="holdings.length === 0">
            <td colspan="4" class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
              目前無持股
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
interface Transaction {
  symbol: string
  type: 'BUY' | 'SELL'
  quantity: number
  price: number
}

interface Holding {
  symbol: string
  quantity: number
  averagePrice: number
}

const props = defineProps<{
  transactions: Transaction[]
}>()

const holdings = computed(() => {
  const holdingMap = new Map<string, { quantity: number; totalCost: number }>()

  // Sort transactions by date if available, otherwise assume they are in order
  // For this component, we assume the passed transactions are all relevant history
  // In a real app, we might need to fetch full history or pass it in

  // Simplified FIFO calculation for display
  // This logic should ideally match the backend logic or be provided by backend
  // Here we implement a basic client-side calculation
  
  for (const tx of props.transactions) {
    const current = holdingMap.get(tx.symbol) || { quantity: 0, totalCost: 0 }
    
    if (tx.type === 'BUY') {
      current.quantity += Number(tx.quantity)
      current.totalCost += Number(tx.quantity) * Number(tx.price)
    } else {
      // SELL - reduce quantity, keep average cost same (realized gain/loss logic omitted for simplicity)
      if (current.quantity > 0) {
        const avgCost = current.totalCost / current.quantity
        current.quantity -= Number(tx.quantity)
        current.totalCost -= Number(tx.quantity) * avgCost
      }
    }
    
    if (current.quantity > 0.000001) { // Avoid floating point zero issues
      holdingMap.set(tx.symbol, current)
    } else {
      holdingMap.delete(tx.symbol)
    }
  }

  return Array.from(holdingMap.entries()).map(([symbol, data]) => ({
    symbol,
    quantity: data.quantity,
    averagePrice: data.quantity > 0 ? data.totalCost / data.quantity : 0
  })).sort((a, b) => a.symbol.localeCompare(b.symbol))
})
</script>
