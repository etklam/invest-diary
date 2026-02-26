<script setup lang="ts">
import type { EtfAnalysis } from '~/lib/etf-analyzer'

type TabKey = 'all' | 'overview' | 'comparison' | 'technical'
type SortField =
  | 'symbol'
  | 'currentPrice'
  | 'dailyChangePercent'
  | 'monthlyChangePercent'
  | 'quarterlyChangePercent'
  | 'ytdChangePercent'
  | 'ma20'
  | 'trendScore'

const tabs: TabKey[] = ['all', 'overview', 'comparison', 'technical']
const sortableFields: Array<{ key: SortField; label: string }> = [
  { key: 'symbol', label: 'tools.etf.fields.symbol' },
  { key: 'currentPrice', label: 'tools.etf.fields.currentPrice' },
  { key: 'dailyChangePercent', label: 'tools.etf.fields.dailyChange' },
  { key: 'monthlyChangePercent', label: 'tools.etf.fields.monthlyChange' },
  { key: 'quarterlyChangePercent', label: 'tools.etf.fields.quarterlyChange' },
  { key: 'ytdChangePercent', label: 'tools.etf.fields.ytdChange' },
  { key: 'ma20', label: 'tools.etf.fields.ma20' },
  { key: 'trendScore', label: 'tools.etf.fields.trend' },
]

const { t } = useI18n()
const toast = useToast()

// State
const selectedSymbol = ref<string>('')
const allEtfsLoading = ref(false)
const analysisLoading = ref(false)
const quoteLoading = ref(false)
const activeTab = ref<TabKey>('all')
const sortBy = ref<SortField>('symbol')
const sortOrder = ref<'asc' | 'desc'>('asc')

// All ETFs data
const allEtfs = ref<EtfAnalysis[]>([])

// Selected ETF analysis
const selectedAnalysis = ref<EtfAnalysis | null>(null)

// Real-time quote for selected ETF
const liveQuote = ref<any>(null)

// Auto-refresh quote
const quoteRefreshInterval = ref<NodeJS.Timeout | null>(null)

// Fetch all ETFs comparison
const fetchAllEtfs = async () => {
  allEtfsLoading.value = true
  try {
    const response = await $fetch<any>('/api/etf/all', {
      params: {
        sort: sortBy.value,
        order: sortOrder.value,
      },
      timeout: 10000,
    })
    allEtfs.value = response || []
  } catch (error) {
    toast.error(t('tools.etf.fetchFailed'))
  } finally {
    allEtfsLoading.value = false
  }
}

// Fetch ETF analysis
const fetchEtfAnalysis = async (symbol: string) => {
  analysisLoading.value = true
  try {
    const response = await $fetch<EtfAnalysis>(`/api/etf/${encodeURIComponent(symbol)}`, {
      timeout: 12000,
    })
    selectedAnalysis.value = response
    selectedSymbol.value = symbol
    await fetchLiveQuote(symbol)
  } catch (error) {
    toast.error(t('tools.etf.fetchFailed'))
  } finally {
    analysisLoading.value = false
  }
}

// Fetch live quote
const fetchLiveQuote = async (symbol: string) => {
  quoteLoading.value = true
  try {
    const response = await $fetch<any>(`/api/etf/${encodeURIComponent(symbol)}/quote`)
    liveQuote.value = response
  } catch (error) {
    // Silently fail for quote updates
  } finally {
    quoteLoading.value = false
  }
}

// Handle sort change
const handleSort = (field: SortField) => {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortBy.value = field
    sortOrder.value = 'asc'
  }
  fetchAllEtfs()
}

// Format number
const normalizeNumber = (value: unknown): number | null => {
  if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
    return null
  }
  return value
}

const formatNumber = (num: number | null | undefined, decimals = 2) => {
  const normalized = normalizeNumber(num)
  if (normalized === null) return '--'
  return normalized.toFixed(decimals)
}

// Format percentage
const formatPercent = (percent: number | null | undefined, decimals = 2) => {
  const normalized = normalizeNumber(percent)
  if (normalized === null) return '--'
  const sign = normalized >= 0 ? '+' : ''
  return `${sign}${normalized.toFixed(decimals)}%`
}

// Get color class for percentage
const getPercentColorClass = (percent: number | null | undefined) => {
  const normalized = normalizeNumber(percent)
  if (normalized === null) return 'text-gray-600 dark:text-gray-400'
  if (normalized > 0) return 'text-green-600 dark:text-green-400'
  if (normalized < 0) return 'text-red-600 dark:text-red-400'
  return 'text-gray-600 dark:text-gray-400'
}

// Get trend color class
const getTrendColorClass = (trend: string) => {
  if (trend === 'bullish') return 'text-green-600 dark:text-green-400'
  if (trend === 'bearish') return 'text-red-600 dark:text-red-400'
  return 'text-gray-600 dark:text-gray-400'
}

// Get trend icon
const getTrendIcon = (trend: string) => {
  if (trend === 'bullish') return '📈'
  if (trend === 'bearish') return '📉'
  return '➡️'
}

// Watchlist management
const watchlist = ref<any[]>([])

const fetchWatchlist = async () => {
  try {
    const response = await $fetch<any>('/api/etf/watchlist')
    watchlist.value = response || []
  } catch (error) {
    // Silently fail if not authenticated
  }
}

const addToWatchlist = async (symbol: string) => {
  try {
    await $fetch('/api/etf/watchlist', {
      method: 'POST',
      body: { symbol },
    })
    toast.success(t('tools.etf.watchlist.addSuccess'))
    await fetchWatchlist()
  } catch (error: any) {
    toast.error(error.data?.message || t('tools.etf.watchlist.addFailed'))
  }
}

const removeFromWatchlist = async (id: string) => {
  try {
    await $fetch(`/api/etf/watchlist/${id}`, { method: 'DELETE' })
    toast.success(t('tools.etf.watchlist.removeSuccess'))
    await fetchWatchlist()
  } catch (error) {
    toast.error(t('tools.etf.watchlist.removeFailed'))
  }
}

// Check if ETF is in watchlist
const isInWatchlist = (symbol: string) => {
  return watchlist.value.some(item => item.symbol === symbol)
}

// On mount
onMounted(() => {
  fetchAllEtfs()
  fetchWatchlist()

  // Set up auto-refresh for quotes every 30 seconds
  quoteRefreshInterval.value = setInterval(() => {
    if (selectedSymbol.value) {
      fetchLiveQuote(selectedSymbol.value)
    }
  }, 30000)
})

// On unmount
onUnmounted(() => {
  if (quoteRefreshInterval.value) {
    clearInterval(quoteRefreshInterval.value)
  }
})

// SEO
useHead({
  title: 'ETF 趨勢分析工具 - 投資工具',
  meta: [
    {
      name: 'description',
      content: '追蹤和分析 ETF 價格變化，提供月度對比、季度變化、同比分析、技術指標等多維度分析。',
    },
  ],
})

// Public access
definePageMeta({
  requiresAuth: false,
})
</script>

<template>
  <div class="max-w-7xl mx-auto px-4 py-8">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {{ t('tools.etf.title') }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400 mb-3">
        {{ t('tools.etf.subtitle') }}
      </p>
      <p class="text-amber-600 dark:text-amber-400 text-sm">
        ⚠️ {{ t('tools.etf.developmentNotice') }}
      </p>
    </div>

    <!-- Symbol Search & Quick Actions -->
    <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 mb-6">
      <div class="flex flex-wrap gap-4 items-center">
        <!-- Symbol Search -->
        <div class="flex-1 min-w-[200px]">
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            {{ t('tools.etf.symbol') }}
          </label>
          <input
            v-model="selectedSymbol"
            type="text"
            :placeholder="t('tools.etf.symbolPlaceholder')"
            class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            @keyup.enter="fetchEtfAnalysis(selectedSymbol)"
          />
        </div>

        <!-- Action Buttons -->
        <div class="flex gap-2 items-end">
          <button
            @click="fetchEtfAnalysis(selectedSymbol)"
            :disabled="analysisLoading || !selectedSymbol"
            class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition"
          >
            {{ analysisLoading ? t('common.loading') : t('tools.etf.analyze') }}
          </button>

          <button
            v-if="selectedSymbol && !isInWatchlist(selectedSymbol)"
            @click="addToWatchlist(selectedSymbol)"
            class="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition"
          >
            {{ t('tools.etf.watchlist.add') }}
          </button>

          <button
            @click="fetchAllEtfs"
            :disabled="allEtfsLoading"
            class="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg font-medium transition"
          >
            {{ allEtfsLoading ? t('common.loading') : t('tools.etf.refresh') }}
          </button>
        </div>
      </div>
    </div>

    <!-- Live Quote Card -->
    <div
      v-if="liveQuote"
      class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 mb-6 text-white"
    >
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-2xl font-bold">{{ liveQuote.symbol }}</h2>
          <p class="text-sm opacity-80">
            {{ t('tools.etf.marketState') }}: {{ liveQuote.marketState }}
          </p>
        </div>
        <div class="text-right">
          <p class="text-3xl font-bold">${{ formatNumber(liveQuote.regularMarketPrice) }}</p>
          <p
            class="text-lg"
            :class="liveQuote.change >= 0 ? 'text-green-200' : 'text-red-200'"
          >
            {{ liveQuote.change >= 0 ? '+' : '' }}{{ formatNumber(liveQuote.change) }}
            ({{ formatPercent(liveQuote.changePercent) }})
          </p>
        </div>
      </div>
      <div class="flex items-center justify-between text-sm opacity-80">
        <span>{{ t('tools.etf.lastUpdate') }}: {{ new Date(liveQuote.lastUpdateTime).toLocaleString() }}</span>
        <button
          @click="fetchLiveQuote(selectedSymbol)"
          :disabled="quoteLoading"
          class="px-3 py-1 bg-white/20 hover:bg-white/30 rounded transition"
        >
          {{ quoteLoading ? t('common.loading') : t('tools.etf.refresh') }}
        </button>
      </div>
    </div>

    <!-- Tabs -->
    <div class="border-b border-gray-200 dark:border-gray-700 mb-6">
      <nav class="flex gap-4">
        <button
          v-for="tab in tabs"
          :key="tab"
          @click="activeTab = tab"
          :class="[
            'px-4 py-2 font-medium transition',
            activeTab === tab
              ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400'
              : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white',
          ]"
        >
          {{ t(`tools.etf.tabs.${tab}`) }}
        </button>
      </nav>
    </div>

    <!-- All ETFs Tab -->
    <div v-if="activeTab === 'all'" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
      <div class="overflow-x-auto">
        <table class="w-full">
          <thead class="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th
                v-for="field in sortableFields"
                :key="field.key"
                @click="handleSort(field.key)"
                class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600"
              >
                {{ t(field.label) }}
                <span v-if="sortBy === field.key">{{ sortOrder === 'asc' ? '↑' : '↓' }}</span>
              </th>
              <th class="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">
                {{ t('tools.etf.fields.actions') }}
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-200 dark:divide-gray-700">
            <tr
              v-for="etf in allEtfs"
              :key="etf.symbol"
              class="hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
              @click="fetchEtfAnalysis(etf.symbol)"
            >
              <td class="px-4 py-3 font-medium text-gray-900 dark:text-white">
                {{ etf.symbol }}
              </td>
              <td class="px-4 py-3 text-gray-900 dark:text-white">
                ${{ formatNumber(etf.currentPrice) }}
              </td>
              <td class="px-4 py-3" :class="getPercentColorClass(etf.daily.changePercent)">
                {{ formatPercent(etf.daily.changePercent) }}
              </td>
              <td class="px-4 py-3" :class="getPercentColorClass(etf.monthly.previousMonth.changePercent)">
                {{ formatPercent(etf.monthly.previousMonth.changePercent) }}
              </td>
              <td class="px-4 py-3" :class="getPercentColorClass(etf.quarterly.changePercent)">
                {{ formatPercent(etf.quarterly.changePercent) }}
              </td>
              <td class="px-4 py-3" :class="getPercentColorClass(etf.ytd.changePercent)">
                {{ formatPercent(etf.ytd.changePercent) }}
              </td>
              <td class="px-4 py-3 text-gray-900 dark:text-white">
                ${{ formatNumber(etf.technical.ma20) }}
              </td>
              <td class="px-4 py-3" :class="getTrendColorClass(etf.technical.trend)">
                {{ getTrendIcon(etf.technical.trend) }} {{ t(`tools.etf.trends.${etf.technical.trend}`) }}
              </td>
              <td class="px-4 py-3">
                <button
                  v-if="!isInWatchlist(etf.symbol)"
                  @click.stop="addToWatchlist(etf.symbol)"
                  class="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300"
                >
                  {{ t('tools.etf.watchlist.add') }}
                </button>
                <span v-else class="text-gray-400">✓</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Overview Tab -->
    <div v-if="activeTab === 'overview' && selectedAnalysis" class="space-y-6">
      <!-- Monthly Comparison -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('tools.etf.monthlyComparison') }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('tools.etf.previousMonth') }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              ${{ formatNumber(selectedAnalysis.monthly.previousMonth.price) }}
            </p>
            <p :class="getPercentColorClass(selectedAnalysis.monthly.previousMonth.changePercent)">
              {{ formatPercent(selectedAnalysis.monthly.previousMonth.changePercent) }}
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('tools.etf.twoMonthsAgo') }}</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              ${{ formatNumber(selectedAnalysis.monthly.twoMonthsAgo.price) }}
            </p>
            <p :class="getPercentColorClass(selectedAnalysis.monthly.twoMonthsAgo.changePercent)">
              {{ formatPercent(selectedAnalysis.monthly.twoMonthsAgo.changePercent) }}
            </p>
          </div>
        </div>
      </div>

      <!-- Quarterly Change -->
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('tools.etf.quarterlyChange') }}
        </h3>
        <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <p class="text-2xl font-bold" :class="getPercentColorClass(selectedAnalysis.quarterly.changePercent)">
            {{ formatPercent(selectedAnalysis.quarterly.changePercent) }}
          </p>
          <p class="text-sm text-gray-600 dark:text-gray-400">
            {{ t('tools.etf.vsPreviousQuarter') }}
          </p>
        </div>
      </div>

      <!-- Yearly Comparison -->
      <div
        v-if="selectedAnalysis.yearlyComparison"
        class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6"
      >
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('tools.etf.yearlyComparison') }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('tools.etf.lastYear') }}</p>
            <p class="text-2xl font-bold" :class="getPercentColorClass(selectedAnalysis.yearlyComparison.lastYearChange)">
              {{ formatPercent(selectedAnalysis.yearlyComparison.lastYearChange) }}
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('tools.etf.thisYear') }}</p>
            <p class="text-2xl font-bold" :class="getPercentColorClass(selectedAnalysis.yearlyComparison.thisYearChange)">
              {{ formatPercent(selectedAnalysis.yearlyComparison.thisYearChange) }}
            </p>
          </div>
        </div>
        <p class="mt-4 text-center" :class="selectedAnalysis.yearlyComparison.improved ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'">
          {{ selectedAnalysis.yearlyComparison.improved ? t('tools.etf.improved') : t('tools.etf.declined') }}
        </p>
      </div>
    </div>

    <!-- Comparison Tab -->
    <div v-if="activeTab === 'comparison' && selectedAnalysis" class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('tools.etf.yearlyComparison') }}
        </h3>
        <div v-if="selectedAnalysis.yearlyComparison" class="space-y-4">
          <div class="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span class="text-gray-600 dark:text-gray-400">{{ t('tools.etf.lastYear') }}</span>
            <span class="text-xl font-bold" :class="getPercentColorClass(selectedAnalysis.yearlyComparison.lastYearChange)">
              {{ formatPercent(selectedAnalysis.yearlyComparison.lastYearChange) }}
            </span>
          </div>
          <div class="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <span class="text-gray-600 dark:text-gray-400">{{ t('tools.etf.thisYear') }}</span>
            <span class="text-xl font-bold" :class="getPercentColorClass(selectedAnalysis.yearlyComparison.thisYearChange)">
              {{ formatPercent(selectedAnalysis.yearlyComparison.thisYearChange) }}
            </span>
          </div>
          <div class="flex justify-between items-center p-4 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
            <span class="text-gray-600 dark:text-gray-400">{{ t('tools.etf.difference') }}</span>
            <span class="text-xl font-bold" :class="getPercentColorClass(selectedAnalysis.yearlyComparison.difference)">
              {{ formatPercent(selectedAnalysis.yearlyComparison.difference) }}
            </span>
          </div>
        </div>
        <p v-else class="text-gray-600 dark:text-gray-400">{{ t('tools.etf.noYearlyData') }}</p>
      </div>
    </div>

    <!-- Technical Tab -->
    <div v-if="activeTab === 'technical' && selectedAnalysis" class="space-y-6">
      <div class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          {{ t('tools.etf.technicalIndicators') }}
        </h3>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">MA20</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              ${{ formatNumber(selectedAnalysis.technical.ma20) }}
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">MA60</p>
            <p class="text-2xl font-bold text-gray-900 dark:text-white">
              ${{ formatNumber(selectedAnalysis.technical.ma60) }}
            </p>
          </div>
          <div class="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg text-center">
            <p class="text-sm text-gray-600 dark:text-gray-400">{{ t('tools.etf.trend') }}</p>
            <p class="text-2xl font-bold" :class="getTrendColorClass(selectedAnalysis.technical.trend)">
              {{ getTrendIcon(selectedAnalysis.technical.trend) }}
              {{ t(`tools.etf.trends.${selectedAnalysis.technical.trend}`) }}
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- Watchlist Section -->
    <div class="mt-8">
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-xl font-semibold text-gray-900 dark:text-white">
          {{ t('tools.etf.watchlist.title') }}
        </h2>
      </div>

      <div v-if="watchlist.length === 0" class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-8 text-center">
        <p class="text-gray-600 dark:text-gray-400">{{ t('tools.etf.watchlist.empty') }}</p>
      </div>

      <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="item in watchlist"
          :key="item.id"
          class="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4"
        >
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-bold text-gray-900 dark:text-white">{{ item.symbol }}</h3>
            <button
              @click="removeFromWatchlist(item.id)"
              class="text-red-600 hover:text-red-800 dark:text-red-400"
            >
              {{ t('common.delete') }}
            </button>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">{{ item.name }}</p>
          <div class="flex items-center justify-between">
            <span class="text-2xl font-bold text-gray-900 dark:text-white">
              ${{ formatNumber(item.latestPrice || 0) }}
            </span>
            <button
              @click="fetchEtfAnalysis(item.symbol)"
              class="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded text-sm"
            >
              {{ t('tools.etf.analyze') }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
