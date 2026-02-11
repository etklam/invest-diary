<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- Header -->
    <header class="bg-white dark:bg-gray-800 shadow">
      <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div class="flex items-center justify-between">
          <div>
            <h1 class="text-2xl font-bold text-gray-900 dark:text-white">股票管理</h1>
            <p class="text-sm text-gray-500 dark:text-gray-400 mt-1">查看所有持股資訊 (FIFO 計算)</p>
          </div>
          <NuxtLink
            to="/"
            class="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            <Icon name="heroicons:home" class="mr-2 h-4 w-4" />
            回首頁
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Main Content -->
    <main class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <!-- Total Holdings Value -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              總持股數量
            </dt>
            <dd class="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {{ totalHoldings }}
            </dd>
          </div>
        </div>

        <!-- Total Cost -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              總成本
            </dt>
            <dd class="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {{ formatCurrency(totalCost) }}
            </dd>
          </div>
        </div>

        <!-- Unique Stocks -->
        <div class="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg">
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              持股種類
            </dt>
            <dd class="mt-1 text-3xl font-semibold text-gray-900 dark:text-white">
              {{ holdings?.length ?? 0 }}
            </dd>
          </div>
        </div>
      </div>

      <!-- Holdings Pie Chart -->
      <div v-if="holdings.length > 0" class="bg-white dark:bg-gray-800 shadow rounded-lg mb-8 p-6">
        <h3 class="text-lg font-medium text-gray-900 dark:text-white mb-4">成本占比圓形圖</h3>
        <svg viewBox="0 0 32 32" class="w-64 h-64 mx-auto">
          <circle
            v-for="(slice, index) in pieSlices"
            :key="index"
            r="16"
            cx="16"
            cy="16"
            fill="transparent"
            stroke-width="32"
            :stroke="slice.color"
            :stroke-dasharray="slice.dashArray"
            :stroke-dashoffset="slice.dashOffset"
          />
        </svg>
        <ul class="mt-4 grid grid-cols-2 gap-2 text-sm">
          <li v-for="(slice, index) in pieSlices" :key="index" class="flex items-center">
            <span class="w-3 h-3 rounded-full mr-2" :style="{ backgroundColor: slice.color }"></span>
            {{ slice.label }} ({{ slice.percentage }})
          </li>
        </ul>
      </div>

      <!-- Holdings Table -->
      <div class="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
        <div class="px-4 py-5 sm:px-6 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg leading-6 font-medium text-gray-900 dark:text-white">
            當前持股明細
          </h3>
          <p class="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            根據所有交易記錄計算
          </p>
        </div>

        <div v-if="pending" class="px-4 py-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">載入中...</p>
        </div>

        <div v-else-if="error" class="px-4 py-8 text-center">
          <Icon name="heroicons:exclamation-circle" class="mx-auto h-12 w-12 text-red-500" />
          <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">載入失敗</p>
          <button
            @click="() => refresh()"
            class="mt-3 inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            重新載入
          </button>
        </div>

        <div v-else>
          <!-- Desktop Table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead class="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th
                    scope="col"
                    @click="sortBy('symbol')"
                    class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div class="flex items-center gap-1">
                      代碼
                      <Icon v-if="sortColumn === 'symbol'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    @click="sortBy('quantity')"
                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div class="flex items-center justify-end gap-1">
                      數量
                      <Icon v-if="sortColumn === 'quantity'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    @click="sortBy('avgCost')"
                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div class="flex items-center justify-end gap-1">
                      平均成本
                      <Icon v-if="sortColumn === 'avgCost'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    @click="sortBy('totalCost')"
                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div class="flex items-center justify-end gap-1">
                      總成本
                      <Icon v-if="sortColumn === 'totalCost'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </div>
                  </th>
                  <th
                    scope="col"
                    @click="sortBy('percentage')"
                    class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 select-none"
                  >
                    <div class="flex items-center justify-end gap-1">
                      成本占比
                      <Icon v-if="sortColumn === 'percentage'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                <tr v-for="holding in sortedHoldings" :key="holding.symbol">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-indigo-600 dark:text-indigo-400">
                    {{ holding.symbol }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                    {{ formatQuantity(holding.quantity) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300 text-right">
                    {{ formatCurrency(holding.avgCost) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white text-right">
                    {{ formatCurrency(holding.totalCost) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span
                      class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                      :class="getPercentageClass(holding.totalCost)"
                    >
                      {{ formatPercentage(holding.totalCost) }}
                    </span>
                  </td>
                </tr>
                <tr v-if="!holdings || holdings.length === 0">
                  <td colspan="5" class="px-6 py-12 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 text-center">
                    <div class="flex flex-col items-center">
                      <Icon name="heroicons:document" class="h-12 w-12 text-gray-400 mb-2" />
                      <p>目前無持股</p>
                      <NuxtLink
                        to="/diaries/new"
                        class="mt-2 text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
                      >
                        建立新日記並新增交易
                      </NuxtLink>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- Mobile Card Layout -->
          <div class="md:hidden space-y-4 px-4 py-4">
            <div v-if="!holdings || holdings.length === 0" class="text-center py-8">
              <Icon name="heroicons:document" class="h-12 w-12 text-gray-400 mb-2 mx-auto" />
              <p class="text-sm text-gray-500 dark:text-gray-400">目前無持股</p>
              <NuxtLink
                to="/diaries/new"
                class="mt-2 inline-block text-indigo-600 dark:text-indigo-400 hover:text-indigo-500 dark:hover:text-indigo-300"
              >
                建立新日記並新增交易
              </NuxtLink>
            </div>

            <div
              v-for="holding in sortedHoldings"
              :key="holding.symbol"
              class="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-lg font-semibold text-indigo-600 dark:text-indigo-400">
                  {{ holding.symbol }}
                </h4>
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  :class="getPercentageClass(holding.totalCost)"
                >
                  {{ formatPercentage(holding.totalCost) }}
                </span>
              </div>
              <div class="space-y-2 text-sm">
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">數量</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    {{ formatQuantity(holding.quantity) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">平均成本</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    {{ formatCurrency(holding.avgCost) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500 dark:text-gray-400">總成本</span>
                  <span class="font-medium text-gray-900 dark:text-white">
                    {{ formatCurrency(holding.totalCost) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Transaction History Link -->
      <div v-if="holdings.length > 0" class="mt-6 text-center">
        <NuxtLink
          to="/diaries"
          class="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
        >
          <Icon name="heroicons:document-text" class="mr-2 h-4 w-4" />
          查看所有交易日記
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  middleware: 'auth'
})

interface Holding {
  symbol: string
  quantity: number
  avgCost: number
  totalCost: number
}

// Fetch holdings from API (client-only to avoid auth mismatch on SSR)
const { data: holdings, pending, error, refresh } = await useLazyFetch<Holding[]>(
  '/api/stocks/holdings',
  {
    server: false,
    default: () => []
  }
)

// Sorting state
const sortColumn = ref<'symbol' | 'quantity' | 'avgCost' | 'totalCost' | 'percentage'>('totalCost')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Sort holdings by selected column
const sortBy = (column: typeof sortColumn.value) => {
  if (sortColumn.value === column) {
    // Toggle direction if clicking same column
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New column, default to desc for numbers, asc for symbol
    sortColumn.value = column
    sortDirection.value = column === 'symbol' ? 'asc' : 'desc'
  }
}

// Sorted holdings with current sort
const sortedHoldings = computed(() => {
  if (!holdings.value) return []

  const sorted = [...holdings.value]

  sorted.sort((a, b) => {
    let comparison = 0

    switch (sortColumn.value) {
      case 'symbol':
        comparison = a.symbol.localeCompare(b.symbol)
        break
      case 'quantity':
        comparison = a.quantity - b.quantity
        break
      case 'avgCost':
        comparison = a.avgCost - b.avgCost
        break
      case 'totalCost':
        comparison = a.totalCost - b.totalCost
        break
      case 'percentage':
        const aPercentage = totalCost.value > 0 ? (a.totalCost / totalCost.value) : 0
        const bPercentage = totalCost.value > 0 ? (b.totalCost / totalCost.value) : 0
        comparison = aPercentage - bPercentage
        break
    }

    return sortDirection.value === 'asc' ? comparison : -comparison
  })

  return sorted
})

// Calculate total holdings count
const totalHoldings = computed(() => {
  if (!holdings.value) return 0
  return holdings.value.length
})

// Calculate total cost
const totalCost = computed(() => {
  if (!holdings.value) return 0
  return holdings.value.reduce((sum, h) => sum + h.totalCost, 0)
})

// Format quantity for display
const formatQuantity = (qty: number): string => {
  return qty.toFixed(4).replace(/\.?0+$/, '')
}

// Format currency
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-TW', {
    style: 'currency',
    currency: 'TWD',
    minimumFractionDigits: 2
  }).format(amount)
}

// Format percentage
const formatPercentage = (cost: number): string => {
  if (totalCost.value === 0) return '0%'
  const percentage = (cost / totalCost.value) * 100
  return `${percentage.toFixed(1)}%`
}

// Get percentage badge class
const getPercentageClass = (cost: number): string => {
  if (totalCost.value === 0) return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'

  const percentage = (cost / totalCost.value) * 100

  if (percentage >= 20) {
    return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
  } else if (percentage >= 10) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
  } else {
    return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
  }
}

// Pie chart slices based on cost percentage
const pieSlices = computed(() => {
  if (!holdings.value || totalCost.value === 0) return []

  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7']
  // Circle circumference: 2 * π * r = 2 * π * 16 ≈ 100.53
  const circumference = 2 * Math.PI * 16
  let cumulative = 0

  return holdings.value.map((h, index) => {
    const percentage = h.totalCost / totalCost.value
    const strokeLength = percentage * circumference
    const dashArray = `${strokeLength} ${circumference - strokeLength}`
    const dashOffset = -cumulative * circumference
    cumulative += percentage

    return {
      label: h.symbol,
      percentage: `${(percentage * 100).toFixed(1)}%`,
      dashArray,
      dashOffset,
      color: colors[index % colors.length]
    }
  })
})

// Set page meta
useHead({
  title: '股票管理 - 投資日記'
})
</script>
