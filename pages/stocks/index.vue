<template>
  <div class="stocks-page min-h-screen">
    <!-- Header -->
    <header class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
      <div class="panel px-4 py-5 sm:px-6">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p class="kicker mb-1">Portfolio Console</p>
            <h1 class="text-2xl font-semibold text-slate-900 dark:text-slate-100">股票管理</h1>
            <p class="text-sm text-slate-500 dark:text-slate-400 mt-1">查看所有持股資訊 (FIFO 計算)</p>
          </div>
          <NuxtLink
            to="/"
            class="action-btn-muted mt-1 cursor-pointer sm:mt-0"
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
        <div class="panel">
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
              總持股數量
            </dt>
            <dd class="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {{ totalHoldings }}
            </dd>
          </div>
        </div>

        <!-- Total Cost -->
        <div class="panel">
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
              總成本
            </dt>
            <dd class="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {{ formatCurrency(totalCost) }}
            </dd>
          </div>
        </div>

        <!-- Unique Stocks -->
        <div class="panel">
          <div class="px-4 py-5 sm:p-6">
            <dt class="text-sm font-medium text-slate-500 dark:text-slate-400 truncate">
              持股種類
            </dt>
            <dd class="mt-1 text-3xl font-semibold text-slate-900 dark:text-slate-100">
              {{ holdings?.length ?? 0 }}
            </dd>
          </div>
        </div>
      </div>

      <!-- Holdings Donut Chart -->
      <section v-if="holdings.length > 0" class="py-4 overflow-hidden mb-8">
        <div class="pt-4 px-6 pb-6 panel">
            <div class="flex flex-wrap items-center justify-between mb-11 -m-2">
              <div class="w-auto p-2">
                <h3 class="font-heading text-lg font-semibold text-slate-900 dark:text-slate-100">
                  {{ t('stock.analytics') }}
                </h3>
              </div>
              <div class="w-auto p-2">
                <svg class="text-slate-300 dark:text-slate-500" width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M3.75 8C3.19772 8 2.75 8.44772 2.75 9C2.75 9.55228 3.19772 10 3.75 10V8ZM3.7575 10C4.30978 10 4.7575 9.55228 4.7575 9C4.7575 8.44772 4.30978 8 3.7575 8V10ZM9 8C8.44772 8 8 8.44772 8 9C8 9.55228 8.44772 10 9 10V8ZM9.0075 10C9.55978 10 10.0075 9.55228 10.0075 9C10.0075 8.44772 9.55978 8 9.0075 8V10ZM14.25 8C13.6977 8 13.25 8.44772 13.25 9C13.25 9.55228 13.6977 10 14.25 10V8ZM14.2575 10C14.8098 10 15.2575 9.55228 15.2575 9C15.2575 8.44772 14.8098 8 14.2575 8V10ZM3.5 9C3.5 8.86193 3.61193 8.75 3.75 8.75V10.75C4.7165 10.75 5.5 9.9665 5.5 9H3.5ZM3.75 8.75C3.88807 8.75 4 8.86193 4 9H2C2 9.9665 2.7835 10.75 3.75 10.75V8.75ZM4 9C4 9.13807 3.88807 9.25 3.75 9.25V7.25C2.7835 7.25 2 8.0335 2 9H4ZM3.75 9.25C3.61193 9.25 3.5 9.13807 3.5 9H5.5C5.5 8.0335 4.7165 7.25 3.75 7.25V9.25ZM8.75 9C8.75 8.86193 8.86193 8.75 9 8.75V10.75C9.9665 10.75 10.75 9.9665 10.75 9H8.75ZM9 8.75C9.13807 8.75 9.25 8.86193 9.25 9H7.25C7.25 9.9665 8.0335 10.75 9 10.75V8.75ZM9.25 9C9.25 9.13807 9.13807 9.25 9 9.25V7.25C8.0335 7.25 7.25 8.0335 7.25 9H9.25ZM9 9.25C8.86193 9.25 8.75 9.13807 8.75 9H10.75C10.75 8.0335 9.9665 7.25 9 7.25V9.25ZM14 9C14 8.86193 14.1119 8.75 14.25 8.75V10.75C15.2165 10.75 16 9.9665 16 9H14ZM14.25 8.75C14.3881 8.75 14.5 8.86193 14.5 9H12.5C12.5 9.9665 13.2835 10.75 14.25 10.75V8.75ZM14.5 9C14.5 9.13807 14.3881 9.25 14.25 9.25V7.25C13.2835 7.25 12.5 8.0335 12.5 9H14.5ZM14.25 9.25C14.1119 9.25 14 9.13807 14 9H16C16 8.0335 15.2165 7.25 14.25 7.25V9.25ZM3.75 10H3.7575V8H3.75V10ZM9 10H9.0075V8H9V10ZM14.25 10H14.2575V8H14.25V10Z" fill="currentColor"></path>
                </svg>
              </div>
            </div>
            <!-- Donut Chart -->
            <div class="chart mb-10 flex justify-center">
              <div class="relative w-64 h-64">
                <svg
                  viewBox="0 0 100 100"
                  class="w-full h-full"
                >
                  <g transform="rotate(-90 50 50)">
                    <circle
                      v-for="(slice, index) in donutSlices"
                      :key="index"
                      cx="50"
                      cy="50"
                      :r="slice.radius"
                      fill="transparent"
                      :stroke="slice.color"
                      :stroke-width="slice.strokeWidth"
                      :stroke-dasharray="slice.dashArray"
                      :stroke-dashoffset="slice.dashOffset"
                    />
                  </g>
                </svg>
                <!-- Center text overlay -->
                <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <div class="text-center">
                    <div class="text-lg font-bold text-slate-800 dark:text-slate-100">
                      {{ holdings?.length ?? 0 }}
                    </div>
                    <div class="text-xs text-slate-500 dark:text-slate-400">
                      {{ t('stock.holdings') }}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <!-- Legend -->
            <div class="flex flex-wrap justify-center -m-5">
              <div v-for="(slice, index) in pieSlices" :key="index" class="w-auto p-5">
                <div class="inline-flex items-center">
                  <span class="mr-3 w-3 h-3 rounded-full" :style="{ backgroundColor: slice.color }"></span>
                  <span class="font-medium text-slate-900 dark:text-slate-100">{{ slice.label }} ({{ slice.percentage }})</span>
                </div>
              </div>
            </div>
          </div>
      </section>

      <!-- Holdings Table -->
      <div class="panel overflow-hidden">
        <div class="px-4 py-5 sm:px-6 border-b border-slate-200 dark:border-slate-700">
          <h3 class="text-lg leading-6 font-medium text-slate-900 dark:text-slate-100">
            當前持股明細
          </h3>
          <p class="mt-1 max-w-2xl text-sm text-slate-500 dark:text-slate-400">
            根據所有交易記錄計算
          </p>
        </div>

        <div v-if="pending" class="px-4 py-8 text-center">
          <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 dark:border-indigo-400"></div>
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">載入中...</p>
        </div>

        <div v-else-if="error" class="px-4 py-8 text-center">
          <Icon name="heroicons:exclamation-circle" class="mx-auto h-12 w-12 text-red-500" />
          <p class="mt-2 text-sm text-slate-500 dark:text-slate-400">載入失敗</p>
          <button
            @click="() => refresh()"
            class="mt-3 action-btn-muted cursor-pointer"
          >
            重新載入
          </button>
        </div>

        <div v-else>
          <!-- Desktop Table -->
          <div class="hidden md:block overflow-x-auto">
            <table class="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
              <thead class="bg-slate-50 dark:bg-slate-950">
                <tr>
                  <th
                    scope="col"
                    :aria-sort="getAriaSort('symbol')"
                    class="px-6 py-3 text-left text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      @click="sortBy('symbol')"
                      class="inline-flex items-center gap-1 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-900 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      代碼
                      <Icon v-if="sortColumn === 'symbol'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    :aria-sort="getAriaSort('quantity')"
                    class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      @click="sortBy('quantity')"
                      class="ml-auto inline-flex items-center justify-end gap-1 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-900 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      數量
                      <Icon v-if="sortColumn === 'quantity'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    :aria-sort="getAriaSort('avgCost')"
                    class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      @click="sortBy('avgCost')"
                      class="ml-auto inline-flex items-center justify-end gap-1 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-900 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      平均成本
                      <Icon v-if="sortColumn === 'avgCost'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </button>
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    現價
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    市值
                  </th>
                  <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider">
                    未實現損益
                  </th>
                  <th
                    scope="col"
                    :aria-sort="getAriaSort('totalCost')"
                    class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      @click="sortBy('totalCost')"
                      class="ml-auto inline-flex items-center justify-end gap-1 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-900 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      總成本
                      <Icon v-if="sortColumn === 'totalCost'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </button>
                  </th>
                  <th
                    scope="col"
                    :aria-sort="getAriaSort('percentage')"
                    class="px-6 py-3 text-right text-xs font-medium text-slate-500 dark:text-slate-300 uppercase tracking-wider"
                  >
                    <button
                      type="button"
                      @click="sortBy('percentage')"
                      class="ml-auto inline-flex items-center justify-end gap-1 rounded px-1 py-1 hover:bg-slate-100 dark:hover:bg-slate-900 select-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      成本占比
                      <Icon v-if="sortColumn === 'percentage'" :name="sortDirection === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'" class="w-4 h-4" />
                      <Icon v-else name="heroicons:chevron-up-down" class="w-4 h-4 opacity-30" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody class="bg-white dark:bg-slate-950 divide-y divide-slate-200 dark:divide-slate-800">
                <tr v-for="holding in sortedHoldings" :key="holding.symbol">
                  <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-700 dark:text-blue-400">
                    {{ holding.symbol }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right">
                    {{ formatQuantity(holding.quantity) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-500 dark:text-slate-300 text-right">
                    {{ formatCurrency(holding.avgCost) }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right">
                    {{ holding.price ? formatCurrency(holding.price) : '—' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right">
                    {{ holding.price ? formatCurrency(holding.price * holding.quantity) : '—' }}
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-right">
                    <span :class="holding.price && holding.price * holding.quantity - holding.totalCost >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                      {{ holding.price ? formatCurrency(holding.price * holding.quantity - holding.totalCost) : '—' }}
                    </span>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-sm text-slate-900 dark:text-slate-100 text-right">
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
                  <td colspan="5" class="px-6 py-12 whitespace-nowrap text-sm text-slate-500 dark:text-slate-400 text-center">
                    <div class="flex flex-col items-center">
                      <Icon name="heroicons:document" class="h-12 w-12 text-slate-400 mb-2" />
                      <p>目前無持股</p>
                      <NuxtLink
                        to="/diaries/new"
                        class="mt-2 text-blue-700 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-200"
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
              <Icon name="heroicons:document" class="h-12 w-12 text-slate-400 mb-2 mx-auto" />
              <p class="text-sm text-slate-500 dark:text-slate-400">目前無持股</p>
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
              class="bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 p-4"
            >
              <div class="flex items-center justify-between mb-3">
                <h4 class="text-lg font-semibold text-blue-700 dark:text-blue-400">
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
                  <span class="text-slate-500 dark:text-slate-400">數量</span>
                  <span class="font-medium text-slate-900 dark:text-slate-100">
                    {{ formatQuantity(holding.quantity) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500 dark:text-slate-400">平均成本</span>
                  <span class="font-medium text-slate-900 dark:text-slate-100">
                    {{ formatCurrency(holding.avgCost) }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-500 dark:text-slate-400">總成本</span>
                  <span class="font-medium text-slate-900 dark:text-slate-100">
                    {{ formatCurrency(holding.totalCost) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Fetch Stock Price -->
      <div class="mt-6 text-center">
        <button
          @click="fetchStockPrices"
          :disabled="isFetchingPrices || cooldownRemaining > 0"
          class="action-btn-muted mr-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Icon :name="isFetchingPrices ? 'svg-spinners:180-ring-with-bg' : 'heroicons:arrow-path'" class="mr-2 h-4 w-4" />
          {{ buttonText }}
        </button>
      </div>

      <!-- Transaction History Link -->
      <div v-if="holdings.length > 0" class="mt-4 text-center">
        <NuxtLink
          to="/diaries"
          class="action-btn cursor-pointer"
        >
          <Icon name="heroicons:document-text" class="mr-2 h-4 w-4" />
          查看所有交易日記
        </NuxtLink>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { formatCurrency } from '~/lib/utils'

const { t } = useI18n()

definePageMeta({
  middleware: 'auth'
})

interface Holding {
  symbol: string
  quantity: number
  avgCost: number
  totalCost: number
  price?: number
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
type SortColumn = 'symbol' | 'quantity' | 'avgCost' | 'totalCost' | 'percentage'

const sortColumn = ref<SortColumn>('totalCost')
const sortDirection = ref<'asc' | 'desc'>('desc')

// Sort holdings by selected column
const sortBy = (column: SortColumn) => {
  if (sortColumn.value === column) {
    // Toggle direction if clicking same column
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    // New column, default to desc for numbers, asc for symbol
    sortColumn.value = column
    sortDirection.value = column === 'symbol' ? 'asc' : 'desc'
  }
}

const getAriaSort = (column: SortColumn): 'ascending' | 'descending' | 'none' => {
  if (sortColumn.value !== column) return 'none'
  return sortDirection.value === 'asc' ? 'ascending' : 'descending'
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

// Format percentage
const formatPercentage = (cost: number): string => {
  if (totalCost.value === 0) return '0%'
  const percentage = (cost / totalCost.value) * 100
  return `${percentage.toFixed(1)}%`
}

// Get percentage badge class
const getPercentageClass = (cost: number): string => {
  if (totalCost.value === 0) return 'bg-gray-100 text-gray-800 dark:bg-slate-900 dark:text-slate-300'

  const percentage = (cost / totalCost.value) * 100

  if (percentage >= 20) {
    return 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-200'
  } else if (percentage >= 10) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-amber-950/30 dark:text-amber-200'
  } else {
    return 'bg-green-100 text-green-800 dark:bg-emerald-950/30 dark:text-emerald-200'
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

// Donut chart slices for proper donut visualization
const donutSlices = computed(() => {
  if (!holdings.value || totalCost.value === 0) return []

  const colors = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7']
  // For donut: radius 32.5, stroke-width 15 creates outer edge at 40, inner at 25
  const radius = 32.5
  const strokeWidth = 15
  const circumference = 2 * Math.PI * radius
  let cumulative = 0

  return holdings.value.map((h, index) => {
    const percentage = h.totalCost / totalCost.value
    const strokeLength = percentage * circumference
    const dashArray = `${strokeLength} ${circumference - strokeLength}`
    const dashOffset = -cumulative * circumference
    cumulative += percentage

    return {
      radius,
      strokeWidth,
      dashArray,
      dashOffset,
      color: colors[index % colors.length]
    }
  })
})

// Set page meta

// Stock price fetching cooldown state
const isFetchingPrices = ref(false)
const cooldownRemaining = ref(0)
const COOLDOWN_SECONDS = 60

// Computed button text with i18n
const buttonText = computed(() => {
  if (isFetchingPrices.value) {
    return t('stock.fetching')
  }
  if (cooldownRemaining.value > 0) {
    return t('stock.waitForCooldown', { seconds: cooldownRemaining.value })
  }
  return t('stock.fetchPrice')
})

// Fetch stock prices from server with cooldown
const fetchStockPrices = async () => {
  if (isFetchingPrices.value || cooldownRemaining.value > 0) return

  const toast = useToast()

  try {
    if (!holdings.value || holdings.value.length === 0) {
      toast.warning(t('stock.noHoldingsData'))
      return
    }

    isFetchingPrices.value = true

    const symbols = holdings.value.map(h => h.symbol)

    const prices = await $fetch<Record<string, number>>('/api/stocks/prices', {
      method: 'POST',
      body: { symbols }
    })

    // attach price to holdings
    holdings.value = holdings.value.map(h => ({
      ...h,
      price: prices[h.symbol]
    }))

    toast.success(t('stock.fetchSuccess'))

    // Start cooldown
    cooldownRemaining.value = COOLDOWN_SECONDS
    const cooldownInterval = setInterval(() => {
      cooldownRemaining.value--
      if (cooldownRemaining.value <= 0) {
        clearInterval(cooldownInterval)
      }
    }, 1000)
  } catch (err) {
    console.error('Failed to fetch stock prices', err)
    toast.error(t('stock.fetchFailed'))
  } finally {
    isFetchingPrices.value = false
  }
}

useHead({
  title: '股票管理 - 投資日記'
})
</script>

<style scoped>
.stocks-page {
  background:
    radial-gradient(900px 420px at 8% -8%, rgb(59 130 246 / 11%), transparent 62%),
    radial-gradient(800px 380px at 96% -12%, rgb(245 158 11 / 8%), transparent 65%),
    #f8fafc;
}

.panel {
  border: 1px solid rgb(191 219 254);
  border-radius: 0.95rem;
  background: rgb(255 255 255 / 84%);
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 26px rgb(30 64 175 / 8%);
}

.kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgb(59 130 246);
  font-weight: 700;
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.75rem;
  padding: 0.58rem 1rem;
  color: white;
  background: #1e40af;
  transition: background-color 180ms ease;
}

.action-btn:hover {
  background: #1d4ed8;
}

.action-btn-muted {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(191 219 254);
  border-radius: 0.75rem;
  padding: 0.55rem 0.9rem;
  color: rgb(30 58 138);
  background: rgb(239 246 255);
  transition: background-color 180ms ease;
}

.action-btn-muted:hover {
  background: rgb(219 234 254);
}

:global(.dark .stocks-page) , :global(.dark-mode .stocks-page)  {
  background:
    radial-gradient(900px 420px at 8% -8%, rgb(59 130 246 / 9%), transparent 62%),
    radial-gradient(800px 380px at 96% -12%, rgb(15 23 42 / 12%), transparent 65%),
    rgb(2 6 18);
}

:global(.dark .panel) , :global(.dark-mode .panel)  {
  border-color: rgb(71 85 105);
  background: rgb(3 10 24 / 92%);
  box-shadow: 0 12px 26px rgb(2 6 23 / 45%);
}

:global(.dark .action-btn-muted) , :global(.dark-mode .action-btn-muted)  {
  border-color: rgb(100 116 139);
  color: rgb(186 230 253);
  background: rgb(12 19 35);
}

:global(.dark .action-btn-muted):hover , :global(.dark-mode .action-btn-muted):hover  {
  background: rgb(20 30 48);
}

:global(.dark .action-btn), :global(.dark-mode .action-btn) {
  background: #1e3a8a;
  color: rgb(226 232 240);
}

:global(.dark .action-btn):hover, :global(.dark-mode .action-btn):hover {
  background: #1d4ed8;
}
</style>
