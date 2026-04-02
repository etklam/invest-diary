<template>
  <div class="stocks-page min-h-screen pb-20">
    <!-- Header -->
    <header class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <Icon name="heroicons:presentation-chart-line" class="text-blue-600 dark:text-blue-400" />
            {{ t('stock.dashboard.title') }}
          </h1>
          <div class="flex items-center gap-3 mt-1">
            <p class="text-sm text-slate-500 dark:text-slate-400">
              {{ t('stock.dashboard.manageDescription') }}
            </p>
            <span v-if="marketState" class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span class="w-1.5 h-1.5 rounded-full" :class="marketState === 'REGULAR' ? 'bg-green-500 animate-pulse' : 'bg-amber-500'"></span>
              {{ t('stock.dashboard.marketState') }}: {{ marketState }}
            </span>
          </div>
        </div>
        <div class="flex items-center gap-3">
          <button
            @click="fetchStockPrices"
            :disabled="isFetchingPrices || cooldownRemaining > 0 || pending"
            class="action-btn-dashboard group"
          >
            <Icon :name="(isFetchingPrices || pending) ? 'svg-spinners:180-ring-with-bg' : 'heroicons:arrow-path'" class="w-4 h-4 mr-2 group-hover:rotate-180 transition-transform duration-500" />
            {{ (isFetchingPrices || pending) ? t('stock.fetching') : cooldownRemaining > 0 ? `${cooldownRemaining}s` : t('stock.dashboard.refresh') }}
          </button>
          <NuxtLink to="/" class="action-btn-muted-dashboard">
            <Icon name="heroicons:home" class="w-4 h-4 mr-2" />
            {{ t('stock.dashboard.home') }}
          </NuxtLink>
        </div>
      </div>
    </header>

    <!-- Main Content Grid -->
    <main class="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
      <!-- Top Stats Grid -->
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <!-- Portfolio Value -->
        <div class="stats-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ t('stock.dashboard.netLiquidity') }}</span>
            <Icon name="heroicons:banknotes" class="w-5 h-5 text-blue-500 opacity-50" />
          </div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {{ formatCurrency(currentMarketValue || totalCost) }}
          </div>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="text-xs font-medium" :class="(unrealizedAmount || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ (unrealizedAmount || 0) >= 0 ? '+' : '' }}{{ formatCurrency(unrealizedAmount || 0) }}
            </span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">{{ t('stock.dashboard.totalPL') }}</span>
          </div>
        </div>

        <!-- Day Change -->
        <div class="stats-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ t('stock.dashboard.dayChange') }}</span>
            <Icon name="heroicons:bolt" class="w-5 h-5 text-amber-500 opacity-50" />
          </div>
          <div class="text-2xl font-bold tabular-nums" :class="totalDayChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ totalDayChange >= 0 ? '+' : '' }}{{ formatCurrency(totalDayChange) }}
          </div>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="text-xs font-medium" :class="totalDayChange >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
              {{ totalDayChange >= 0 ? '+' : '' }}{{ totalDayChangePercent.toFixed(2) }}%
            </span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">{{ t('stock.dashboard.today') }}</span>
          </div>
        </div>

        <!-- Margin/Equity Ratio or Total Cost -->
        <div class="stats-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ t('stock.dashboard.totalInvested') }}</span>
            <Icon name="heroicons:credit-card" class="w-5 h-5 text-indigo-500 opacity-50" />
          </div>
          <div class="text-2xl font-bold text-slate-900 dark:text-white tabular-nums">
            {{ formatCurrency(totalCost) }}
          </div>
          <div class="flex items-center gap-1.5 mt-1">
            <span class="text-xs font-medium text-slate-600 dark:text-slate-300">
              {{ totalHoldings }} {{ t('stock.dashboard.positions') }}
            </span>
            <span class="text-[10px] text-slate-400 dark:text-slate-500">{{ t('stock.dashboard.active') }}</span>
          </div>
        </div>

        <!-- Unrealized P/L % -->
        <div class="stats-card">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{{ t('stock.dashboard.unrealizedPLPercent') }}</span>
            <Icon name="heroicons:arrow-trending-up" class="w-5 h-5 text-emerald-500 opacity-50" />
          </div>
          <div class="text-2xl font-bold tabular-nums" :class="totalUnrealizedPct >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
            {{ totalUnrealizedPct >= 0 ? '+' : '' }}{{ totalUnrealizedPct.toFixed(2) }}%
          </div>
          <div class="flex items-center gap-1.5 mt-1">
            <div class="w-full bg-slate-200 dark:bg-slate-700 h-1 rounded-full overflow-hidden">
              <div 
                class="h-full" 
                :class="totalUnrealizedPct >= 0 ? 'bg-green-500' : 'bg-red-500'"
                :style="{ width: Math.min(Math.abs(totalUnrealizedPct) * 2, 100) + '%' }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Main Layout Grid: Holdings Table (Left) + Portfolio Analysis (Right) -->
      <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <!-- Holdings Table Section -->
        <div class="lg:col-span-8 space-y-6">
          <div class="panel-dashboard overflow-hidden">
            <div class="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
              <h3 class="font-bold text-slate-900 dark:text-white flex items-center gap-2 text-base">
                <Icon name="heroicons:list-bullet" class="text-blue-500" />
                {{ t('stock.dashboard.activePositions') }}
              </h3>
              <div class="flex items-center gap-2">
                <div class="relative">
                  <Icon name="heroicons:magnifying-glass" class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                  <input
                    v-model="searchQuery"
                    type="text"
                    :placeholder="t('stock.dashboard.searchPlaceholder')"
                    class="pl-8 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                </div>
              </div>
            </div>

            <div v-if="pending" class="py-20 flex flex-col items-center justify-center">
              <div class="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin"></div>
              <p class="mt-4 text-sm font-medium text-slate-500 dark:text-slate-400">{{ t('stock.dashboard.synchronizing') }}</p>
            </div>

            <div v-else class="overflow-x-auto">
              <table class="w-full text-left border-collapse">
                <thead>
                  <tr class="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 bg-slate-50/50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800">
                    <th class="px-6 py-3 cursor-pointer hover:text-blue-500 transition-colors" @click="sortBy('symbol')">{{ t('stock.symbol') }}</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.dashboard.price') }} / Day %</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.dashboard.marketValue') }}</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.avgPrice') }}</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.dashboard.unrealizedPL') }}</th>
                    <th class="px-6 py-3 text-right">{{ t('stock.dashboard.portfolioPercent') }}</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-slate-100 dark:divide-slate-800/50">
                  <tr
                    v-for="holding in sortedHoldings"
                    :key="holding.symbol"
                    v-memo="[
                      holding.symbol,
                      holding.price,
                      holding.dayChangePercent,
                      holding.marketValue,
                      holding.unrealizedAmount,
                      holding.unrealizedPct
                    ]"
                    class="group hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors"
                  >
                    <td class="px-6 py-4">
                      <div class="flex flex-col">
                        <span class="text-sm font-bold text-blue-600 dark:text-blue-400">{{ holding.symbol }}</span>
                        <span class="text-[10px] text-slate-400 dark:text-slate-500">{{ formatQuantity(holding.quantity) }} {{ t('stock.dashboard.shares') }}</span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex flex-col items-end">
                        <span class="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                          {{ holding.price ? formatCurrency(holding.price) : '—' }}
                        </span>
                        <span v-if="holding.dayChangePercent !== undefined" class="text-[10px] font-bold tabular-nums" :class="holding.dayChangePercent >= 0 ? 'text-green-500' : 'text-red-500'">
                          {{ holding.dayChangePercent >= 0 ? '▲' : '▼' }} {{ Math.abs(holding.dayChangePercent).toFixed(2) }}%
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="text-sm font-medium tabular-nums text-slate-900 dark:text-white">
                        {{ holding.marketValue ? formatCurrency(holding.marketValue) : formatCurrency(holding.totalCost) }}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="text-xs text-slate-500 dark:text-slate-400 tabular-nums">
                        {{ formatCurrency(holding.avgCost) }}
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex flex-col items-end">
                        <span class="text-sm font-bold tabular-nums" :class="(holding.unrealizedAmount || 0) >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
                          {{ (holding.unrealizedAmount || 0) >= 0 ? '+' : '' }}{{ formatCurrency(holding.unrealizedAmount || 0) }}
                        </span>
                        <span v-if="holding.unrealizedPct !== null" class="text-[10px] font-medium opacity-80" :class="holding.unrealizedPct >= 0 ? 'text-green-500' : 'text-red-500'">
                          {{ holding.unrealizedPct >= 0 ? '+' : '' }}{{ holding.unrealizedPct.toFixed(2) }}%
                        </span>
                      </div>
                    </td>
                    <td class="px-6 py-4 text-right">
                      <div class="flex items-center justify-end gap-3">
                        <span class="text-xs font-semibold text-slate-600 dark:text-slate-300">
                          {{ formatPercentage(holding.totalCost) }}
                        </span>
                        <div class="w-12 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden hidden sm:block">
                          <div class="bg-blue-500 h-full" :style="{ width: formatPercentage(holding.totalCost) }"></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <!-- Right Side: Analysis & Charts -->
        <div class="lg:col-span-4 space-y-6">
          <!-- Allocation Card -->
          <div class="panel-dashboard p-6">
            <h3 class="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-6 text-base">
              <Icon name="heroicons:chart-pie" class="text-indigo-500" />
              {{ t('stock.dashboard.assetAllocation') }}
            </h3>

            <div class="flex justify-center mb-6">
              <div class="relative w-48 h-48">
                <svg viewBox="0 0 100 100" class="w-full h-full transform -rotate-90">
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
                    class="transition-all duration-1000 ease-out"
                  />
                </svg>
                <div class="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span class="text-2xl font-black text-slate-900 dark:text-white">{{ totalHoldings }}</span>
                  <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ t('stock.dashboard.assets') }}</span>
                </div>
              </div>
            </div>

            <div class="space-y-3">
              <div v-for="(slice, index) in pieSlices.slice(0, 5)" :key="index" class="flex items-center justify-between group">
                <div class="flex items-center gap-2">
                  <div class="w-2 h-2 rounded-full" :style="{ backgroundColor: slice.color }"></div>
                  <span class="text-xs font-bold text-slate-700 dark:text-slate-300 group-hover:text-blue-500 transition-colors">{{ slice.label }}</span>
                </div>
                <span class="text-xs font-medium text-slate-500">{{ slice.percentage }}</span>
              </div>
              <div v-if="pieSlices.length > 5" class="pt-2 border-t border-slate-100 dark:border-slate-800 text-center">
                <span class="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{{ t('stock.dashboard.moreAssets', { count: pieSlices.length - 5 }) }}</span>
              </div>
            </div>
          </div>

          <!-- Quick Trade Shortcut -->
          <div class="panel-dashboard p-6 bg-blue-600/5 dark:bg-blue-400/5 border-blue-200 dark:border-blue-900/50">
            <h3 class="font-bold text-slate-900 dark:text-white flex items-center gap-2 mb-4 text-base">
              <Icon name="heroicons:plus-circle" class="text-blue-500" />
              {{ t('stock.dashboard.quickTransaction') }}
            </h3>
            <p class="text-xs text-slate-500 dark:text-slate-400 mb-4">{{ t('stock.dashboard.quickTransactionDesc') }}</p>
            <NuxtLink to="/diaries/new" class="flex items-center justify-center gap-2 w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20 active:scale-95">
              <Icon name="heroicons:pencil-square" class="w-4 h-4" />
              {{ t('stock.dashboard.logNewTrade') }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { watch } from 'vue'
import { formatCurrency } from '~/lib/utils'
import { watchDebounced } from '@vueuse/core'

// Track cooldown timer for cleanup
let cooldownTimer: ReturnType<typeof setInterval> | null = null
import {
  buildHoldingChartSegments,
  formatHoldingQuantity,
  formatHoldingShare,
  getHoldingConcentrationClass,
} from '~/lib/stocks-analytics'
import {
  applyStocksView,
  computePortfolioAggregations,
  type ConcentrationFilter,
  type HoldingView,
  type HoldingViewInput,
  type ProfitStatusFilter,
  type SortDirection,
  type StocksSortKey
} from '~/lib/stocks-view'

const { t } = useI18n()

definePageMeta({
  middleware: 'auth'
})

// Fetch holdings from API
const { data: holdings, pending, error, refresh } = await useLazyFetch<HoldingViewInput[]>(
  '/api/stocks/holdings',
  {
    server: false,
    default: () => []
  }
)

const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const profitStatusFilter = ref<ProfitStatusFilter>('all')
const concentrationFilter = ref<ConcentrationFilter>('all')
const sortColumn = ref<StocksSortKey>('totalCost')
const sortDirection = ref<SortDirection>('desc')
const marketState = ref<string | null>(null)

// Debounce search to avoid excessive re-renders (300ms)
watchDebounced(
  searchQuery,
  (value: string) => {
    debouncedSearchQuery.value = value
  },
  { debounce: 300, maxWait: 1000 }
)

// Sorting logic
const sortBy = (key: StocksSortKey) => {
  if (sortColumn.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = key
    sortDirection.value = 'desc'
  }
}

const baseHoldings = computed(() => holdings.value ?? [])

const sortedHoldings = computed<HoldingView[]>(() => {
  return applyStocksView(baseHoldings.value, {
    search: debouncedSearchQuery.value,
    profitStatus: profitStatusFilter.value,
    concentration: concentrationFilter.value,
    sortKey: sortColumn.value,
    sortDir: sortDirection.value
  })
})

// Stats calculations - use shared aggregation logic (optimized: single computed)
const stats = computed(() => computePortfolioAggregations(baseHoldings.value))
const totalHoldings = computed(() => stats.value.totalHoldings)
const totalCost = computed(() => stats.value.totalCost)
const currentMarketValue = computed(() => stats.value.currentMarketValue)
const unrealizedAmount = computed(() => stats.value.unrealizedAmount)
const totalUnrealizedPct = computed(() => stats.value.unrealizedPct)
const totalDayChange = computed(() => stats.value.totalDayChange)
const totalDayChangePercent = computed(() => stats.value.totalDayChangePercent)

// Formatting
const formatQuantity = (qty: number) => formatHoldingQuantity(qty)
const formatPercentage = (cost: number) => formatHoldingShare(cost, totalCost.value)

// Chart data
const donutSlices = computed(() => buildHoldingChartSegments(baseHoldings.value, {
  radius: 38,
  strokeWidth: 12,
}))

const pieSlices = computed(() => donutSlices.value.map(slice => ({
  label: slice.label,
  percentage: slice.percentage,
  color: slice.color,
})))

// Price fetching
const isFetchingPrices = ref(false)
const cooldownRemaining = ref(0)
const COOLDOWN_SECONDS = 30

const fetchStockPrices = async () => {
  if (isFetchingPrices.value || cooldownRemaining.value > 0) return

  const toast = useToast()
  try {
    // Don't show warning if data is still loading or if truly no holdings
    if (!baseHoldings.value.length && !pending.value) {
      toast.warning(t('stock.noHoldingsData'))
      return
    }

    // Wait for initial data to load before fetching prices
    if (pending.value) {
      toast.info(t('stock.dashboard.synchronizing'))
      return
    }

    if (!baseHoldings.value.length) {
      return
    }

    isFetchingPrices.value = true
    const symbols = baseHoldings.value.map(h => h.symbol)

    const pricesData = await $fetch<Record<string, any>>('/api/stocks/prices', {
      method: 'POST',
      body: { symbols }
    })

    // Update holdings with rich data from QuoteResponse
    holdings.value = baseHoldings.value.map(h => {
      const quote = pricesData[h.symbol]
      if (!quote) return h
      
      // Update market state from the first quote
      if (!marketState.value) marketState.value = quote.marketState

      return {
        ...h,
        price: quote.regularMarketPrice,
        dayChange: quote.change,
        dayChangePercent: quote.changePercent
      }
    })

    toast.success(t('stock.dashboard.portfolioUpdated'))

    // Cooldown logic with cleanup
    cooldownRemaining.value = COOLDOWN_SECONDS
    cooldownTimer = setInterval(() => {
      cooldownRemaining.value--
      if (cooldownRemaining.value <= 0 && cooldownTimer) {
        clearInterval(cooldownTimer)
        cooldownTimer = null
      }
    }, 1000)
  } catch (err) {
    console.error('Fetch failed', err)
    toast.error(t('stock.dashboard.couldNotRefresh'))
  } finally {
    isFetchingPrices.value = false
  }
}

// Initial fetch - wait for data to load before fetching prices
watch(
  () => [pending.value, baseHoldings.value.length] as const,
  ([isPending, holdingsCount]) => {
    // Only fetch prices when initial data load completes and we have holdings
    if (!isPending && holdingsCount > 0 && !marketState.value) {
      fetchStockPrices()
    }
  },
  { immediate: true }
)

// Cleanup cooldown timer on component unmount
onScopeDispose(() => {
  if (cooldownTimer) {
    clearInterval(cooldownTimer)
    cooldownTimer = null
  }
})

useHead({
  title: `${t('stock.dashboard.title')} - Investment Diary`
})
</script>

<style scoped>
.stocks-page {
  background: 
    radial-gradient(at 0% 0%, rgba(59, 130, 246, 0.05) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(139, 92, 246, 0.05) 0px, transparent 50%),
    #f8fafc;
}

:global(.dark) .stocks-page,
:global(.dark-mode) .stocks-page {
  background: 
    radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.2) 0px, transparent 50%),
    radial-gradient(at 100% 0%, rgba(76, 29, 149, 0.2) 0px, transparent 50%),
    #020617;
}

@media (prefers-color-scheme: dark) {
  .stocks-page {
    background:
      radial-gradient(at 0% 0%, rgba(30, 58, 138, 0.2) 0px, transparent 50%),
      radial-gradient(at 100% 0%, rgba(76, 29, 149, 0.2) 0px, transparent 50%),
      #020617;
  }
}

.panel-dashboard {
  @apply bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm backdrop-blur-sm;
}

.stats-card {
  @apply bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm hover:shadow-md transition-shadow;
}

.action-btn-dashboard {
  @apply inline-flex items-center justify-center px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all active:scale-95;
}

.action-btn-muted-dashboard {
  @apply inline-flex items-center justify-center px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-sm font-bold rounded-xl transition-all;
}

/* Custom scrollbar for table */
.overflow-x-auto::-webkit-scrollbar {
  height: 6px;
}
.overflow-x-auto::-webkit-scrollbar-track {
  @apply bg-transparent;
}
.overflow-x-auto::-webkit-scrollbar-thumb {
  @apply bg-slate-200 dark:bg-slate-800 rounded-full;
}
</style>
