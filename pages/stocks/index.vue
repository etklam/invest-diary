<template>
  <div class="pb-24">
    <!-- Header -->
    <header class="max-w-content mx-auto mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div class="space-y-1">
        <h1 class="text-3xl font-semibold tracking-tight text-copy">
          {{ t('stock.dashboard.title') }}
        </h1>
        <div class="flex flex-wrap items-center gap-3 mt-1">
          <p class="text-sm text-copy-secondary">
            {{ t('stock.dashboard.manageDescription') }}
          </p>
          <BaseBadge v-if="marketState" :variant="marketState === 'REGULAR' ? 'success' : 'warning'">
            {{ t('stock.dashboard.marketState') }}: {{ marketState }}
          </BaseBadge>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <BaseButton
          variant="secondary"
          @click="fetchStockPrices"
          :loading="isFetchingPrices || pending"
          :disabled="cooldownRemaining > 0"
        >
          <Icon v-if="!isFetchingPrices && !pending" name="lucide:refresh-cw" class="w-4 h-4 mr-2" />
          {{ cooldownRemaining > 0 ? `${cooldownRemaining}s` : t('stock.dashboard.refresh') }}
        </BaseButton>
        <BaseButton variant="primary" @click="navigateTo('/diaries/new')">
          <Icon name="lucide:plus" class="w-4 h-4 mr-2" />
          {{ t('stock.dashboard.logNewTrade') }}
        </BaseButton>
      </div>
    </header>

    <!-- Top Stats Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      <!-- Portfolio Value -->
      <BaseCard class="flex flex-col justify-between min-h-[140px]">
        <span class="text-xs font-semibold text-copy-muted uppercase tracking-widest">{{ t('stock.dashboard.netLiquidity') }}</span>
        <div class="text-2xl font-semibold text-copy tabular-nums mt-2">
          {{ formatCurrency(currentMarketValue || totalCost) }}
        </div>
        <div class="flex items-center gap-1.5 mt-auto pt-2">
          <span class="text-xs font-medium" :class="(unrealizedAmount || 0) >= 0 ? 'text-semantic-success' : 'text-semantic-error'">
            {{ (unrealizedAmount || 0) >= 0 ? '+' : '' }}{{ formatCurrency(unrealizedAmount || 0) }}
          </span>
          <span class="text-[10px] text-copy-muted uppercase tracking-tighter">{{ t('stock.dashboard.totalPL') }}</span>
        </div>
      </BaseCard>

      <!-- Day Change -->
      <BaseCard class="flex flex-col justify-between min-h-[140px]">
        <span class="text-xs font-semibold text-copy-muted uppercase tracking-widest">{{ t('stock.dashboard.dayChange') }}</span>
        <div class="text-2xl font-semibold tabular-nums mt-2" :class="totalDayChange >= 0 ? 'text-semantic-success' : 'text-semantic-error'">
          {{ totalDayChange >= 0 ? '+' : '' }}{{ formatCurrency(totalDayChange) }}
        </div>
        <div class="flex items-center gap-1.5 mt-auto pt-2">
          <span class="text-xs font-medium" :class="totalDayChange >= 0 ? 'text-semantic-success' : 'text-semantic-error'">
            {{ totalDayChange >= 0 ? '+' : '' }}{{ totalDayChangePercent.toFixed(2) }}%
          </span>
          <span class="text-[10px] text-copy-muted uppercase tracking-tighter">{{ t('stock.dashboard.today') }}</span>
        </div>
      </BaseCard>

      <!-- Total Invested -->
      <BaseCard class="flex flex-col justify-between min-h-[140px]">
        <span class="text-xs font-semibold text-copy-muted uppercase tracking-widest">{{ t('stock.dashboard.totalInvested') }}</span>
        <div class="text-2xl font-semibold text-copy tabular-nums mt-2">
          {{ formatCurrency(totalCost) }}
        </div>
        <div class="mt-auto pt-2">
          <span class="text-xs font-medium text-copy-secondary">
            {{ totalHoldings }} {{ t('stock.dashboard.positions') }}
          </span>
        </div>
      </BaseCard>

      <!-- Unrealized P/L % -->
      <BaseCard class="flex flex-col justify-between min-h-[140px]">
        <span class="text-xs font-semibold text-copy-muted uppercase tracking-widest">{{ t('stock.dashboard.unrealizedPLPercent') }}</span>
        <div class="text-2xl font-semibold tabular-nums mt-2" :class="totalUnrealizedPct >= 0 ? 'text-semantic-success' : 'text-semantic-error'">
          {{ totalUnrealizedPct >= 0 ? '+' : '' }}{{ totalUnrealizedPct.toFixed(2) }}%
        </div>
        <div class="w-full bg-line h-1 mt-auto pt-0">
          <div 
            class="h-full" 
            :class="totalUnrealizedPct >= 0 ? 'bg-semantic-success' : 'bg-semantic-error'"
            :style="{ width: Math.min(Math.abs(totalUnrealizedPct) * 2, 100) + '%' }"
          ></div>
        </div>
      </BaseCard>
    </div>

    <!-- Holdings Table Section -->
    <div class="mb-12">
      <BaseCard class="!p-0 overflow-hidden">
        <div class="px-6 py-4 border-b border-line flex items-center justify-between bg-surface-alt">
          <h3 class="font-semibold text-copy flex items-center gap-2">
            <Icon name="lucide:list" class="text-accent h-4 w-4" />
            {{ t('stock.dashboard.activePositions') }}
          </h3>
          <div class="w-48">
            <BaseInput
              v-model="searchQuery"
              type="text"
              :placeholder="t('stock.dashboard.searchPlaceholder')"
              class="!py-1.5"
            />
          </div>
        </div>

        <div v-if="pending" class="p-6 space-y-3">
          <BaseSkeleton variant="text" :count="6" />
        </div>

        <div v-else class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[10px] font-semibold uppercase tracking-widest text-copy-muted bg-surface-alt border-b border-line">
                <th class="px-6 py-4 cursor-pointer hover:text-accent transition-colors" @click="sortBy('symbol')">{{ t('stock.symbol') }}</th>
                <th class="px-6 py-4 text-right">{{ t('stock.dashboard.price') }}</th>
                <th class="px-6 py-4 text-right">{{ t('stock.dashboard.marketValue') }}</th>
                <th class="px-6 py-4 text-right">{{ t('stock.avgPrice') }}</th>
                <th class="px-6 py-4 text-right">{{ t('stock.dashboard.unrealizedPL') }}</th>
                <th class="px-6 py-4 text-right">{{ t('stock.dashboard.portfolioPercent') }}</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-line">
              <tr
                v-for="holding in sortedHoldings"
                :key="holding.symbol"
                class="group hover:bg-surface-alt transition-colors"
              >
                <td class="px-6 py-4">
                  <div class="flex flex-col">
                    <span class="text-sm font-semibold text-accent">{{ holding.symbol }}</span>
                    <span class="text-[10px] text-copy-muted uppercase">{{ formatQuantity(holding.quantity) }} {{ t('stock.dashboard.shares') }}</span>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex flex-col items-end">
                    <span class="text-sm font-medium tabular-nums text-copy">
                      {{ holding.price ? formatCurrency(holding.price) : '—' }}
                    </span>
                    <span v-if="holding.dayChangePercent !== undefined" class="text-[10px] font-semibold tabular-nums" :class="holding.dayChangePercent >= 0 ? 'text-semantic-success' : 'text-semantic-error'">
                      {{ holding.dayChangePercent >= 0 ? '▲' : '▼' }} {{ Math.abs(holding.dayChangePercent).toFixed(2) }}%
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="text-sm font-medium tabular-nums text-copy">
                    {{ holding.marketValue ? formatCurrency(holding.marketValue) : formatCurrency(holding.totalCost) }}
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="text-xs text-copy-secondary tabular-nums">
                    {{ formatCurrency(holding.avgCost) }}
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex flex-col items-end">
                    <span class="text-sm font-semibold tabular-nums" :class="(holding.unrealizedAmount || 0) >= 0 ? 'text-semantic-success' : 'text-semantic-error'">
                      {{ (holding.unrealizedAmount || 0) >= 0 ? '+' : '' }}{{ formatCurrency(holding.unrealizedAmount || 0) }}
                    </span>
                    <span v-if="holding.unrealizedPct !== null" class="text-[10px] font-medium opacity-80" :class="holding.unrealizedPct >= 0 ? 'text-semantic-success' : 'text-semantic-error'">
                      {{ holding.unrealizedPct >= 0 ? '+' : '' }}{{ holding.unrealizedPct.toFixed(2) }}%
                    </span>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-3">
                    <span class="text-xs font-semibold text-copy-secondary">
                      {{ formatPercentage(holding.totalCost) }}
                    </span>
                    <div class="w-12 bg-line h-1 overflow-hidden hidden sm:block">
                      <div class="bg-accent h-full" :style="{ width: formatPercentage(holding.totalCost) }"></div>
                    </div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </BaseCard>
    </div>

    <!-- Performance Dashboard Section -->
    <section class="mt-16">
      <div class="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <h2 class="text-xl font-semibold text-copy flex items-center gap-2">
          <Icon name="lucide:bar-chart-3" class="text-accent h-5 w-5" />
          {{ t('stock.realizedPerformance', '已實現績效') }}
        </h2>
        <div class="flex items-center gap-2">
          <BaseButton
            v-if="perfData && perfData.summary.totalClosedTrades > 0"
            variant="ghost"
            size="sm"
            @click="exportTrades"
            :loading="isExporting"
          >
            <Icon v-if="!isExporting" name="lucide:download" class="w-4 h-4 mr-2" />
            {{ isExporting ? '匯出中...' : 'CSV' }}
          </BaseButton>
          <div class="flex items-center p-1 bg-surface-alt border border-line">
            <button
              v-for="opt in periodOptions"
              :key="opt.value"
              @click="selectedPeriod = opt.value"
              class="px-4 py-1.5 text-xs font-semibold transition-all"
              :class="selectedPeriod === opt.value
                ? 'bg-accent text-copy-inverse'
                : 'text-copy-muted hover:text-copy'"
            >
              {{ opt.label }}
            </button>
          </div>
        </div>
      </div>

      <!-- Realized Performance Stats -->
      <div v-if="perfPending" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <BaseCard v-for="i in 4" :key="i" class="h-32 animate-pulse" />
      </div>

      <div v-else-if="perfData" class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <!-- Win Rate -->
        <BaseCard class="flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-copy-muted uppercase tracking-widest">勝率</span>
          <div class="text-2xl font-semibold tabular-nums mt-1"
            :class="perfData.summary.winRate >= 50 ? 'text-semantic-success' : 'text-semantic-error'">
            {{ perfData.summary.totalClosedTrades > 0 ? perfData.summary.winRate.toFixed(1) + '%' : '—' }}
          </div>
          <div class="text-[10px] text-copy-muted uppercase mt-2">
            {{ perfData.summary.wins }}W / {{ perfData.summary.losses }}L
          </div>
        </BaseCard>

        <!-- Realized P/L -->
        <BaseCard class="flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-copy-muted uppercase tracking-widest">已實現損益</span>
          <div class="text-2xl font-semibold tabular-nums mt-1"
            :class="perfData.summary.totalRealizedPnL >= 0 ? 'text-semantic-success' : 'text-semantic-error'">
            {{ perfData.summary.totalRealizedPnL >= 0 ? '+' : '' }}{{ formatCurrency(perfData.summary.totalRealizedPnL) }}
          </div>
          <div class="text-[10px] text-copy-muted uppercase mt-2">{{ perfData.summary.totalClosedTrades }} 筆交易</div>
        </BaseCard>

        <!-- Max Drawdown -->
        <BaseCard class="flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-copy-muted uppercase tracking-widest">最大回撤</span>
          <div class="text-2xl font-semibold tabular-nums mt-1">
            {{ perfData.summary.totalClosedTrades > 0 ? '-' + perfData.summary.maxDrawdownPct.toFixed(1) + '%' : '—' }}
          </div>
          <div class="text-[10px] text-copy-muted uppercase mt-2">PEAK TO TROUGH</div>
        </BaseCard>

        <!-- Sharpe Ratio -->
        <BaseCard class="flex flex-col justify-between">
          <span class="text-[10px] font-semibold text-copy-muted uppercase tracking-widest">夏普比率</span>
          <div class="text-2xl font-semibold tabular-nums mt-1"
            :class="perfData.summary.sharpe && perfData.summary.sharpe >= 1 ? 'text-semantic-success' : 'text-copy'">
            {{ perfData.summary.sharpe !== null ? perfData.summary.sharpe.toFixed(2) : '—' }}
          </div>
          <div class="text-[10px] text-copy-muted uppercase mt-2">RISK ADJUSTED</div>
        </BaseCard>
      </div>

      <!-- Charts Section -->
      <div v-if="perfData && perfData.periodStats.length > 0" class="grid grid-cols-1 gap-8 mb-8">
        <BaseCard>
          <h3 class="text-sm font-semibold text-copy mb-6 uppercase tracking-widest">損益走勢 ({{ periodLabel }})</h3>
          <div class="h-64">
            <Bar :data="barChartData" :options="barChartOptions" />
          </div>
        </BaseCard>
        
        <BaseCard v-if="perfData.equityCurve && perfData.equityCurve.length > 1">
          <h3 class="text-sm font-semibold text-copy mb-6 uppercase tracking-widest">累積資金曲線</h3>
          <div class="h-64">
            <Line :data="equityCurveData" :options="equityCurveOptions" />
          </div>
        </BaseCard>
      </div>
    </section>

    <!-- History & Snapshots -->
    <section class="mt-16">
      <BaseCard class="!p-0 overflow-hidden">
        <div class="px-6 py-4 border-b border-line flex items-center justify-between bg-surface-alt">
          <h3 class="font-semibold text-copy flex items-center gap-2">
            <Icon name="lucide:history" class="text-accent h-4 w-4" />
            持倉歷史與基準比較
          </h3>
          <BaseButton variant="primary" size="sm" @click="createSnapshot" :loading="isSnapshotting">
            <Icon v-if="!isSnapshotting" name="lucide:camera" class="w-4 h-4 mr-2" />
            建立快照
          </BaseButton>
        </div>
        
        <div class="p-6">
          <div v-if="snapshotsData && snapshotsData.snapshots && snapshotsData.snapshots.length >= 2">
            <div class="flex items-center gap-6 mb-6 text-[10px] font-semibold uppercase tracking-widest">
              <span class="flex items-center gap-2">
                <span class="w-3 h-0.5 bg-accent"></span>
                投資組合
              </span>
              <span class="flex items-center gap-2">
                <span class="w-3 h-0.5 bg-semantic-warning border-dashed border-t"></span>
                {{ snapshotsData.benchmarkSymbol ?? 'SPY' }}
              </span>
            </div>
            <div class="h-64">
              <Line :data="historyChartData" :options="historyChartOptions" />
            </div>
          </div>
          <div v-else class="py-12 text-center text-copy-muted">
            <Icon name="lucide:camera-off" class="w-12 h-12 mx-auto mb-4 opacity-20" />
            <p class="text-sm font-medium">尚無歷史數據</p>
            <p class="text-xs mt-1">累積兩筆以上快照後即可顯示趨勢分析</p>
          </div>
        </div>
      </BaseCard>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  BarElement,
  LinearScale,
  CategoryScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  Filler,
} from 'chart.js'
import type { QuoteResponse } from '~/lib/yahoo-finance'
import { formatCurrency } from '~/lib/utils'
import { watchDebounced } from '@vueuse/core'
import {
  formatHoldingQuantity,
  formatHoldingShare,
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

ChartJS.register(BarElement, LinearScale, CategoryScale, Tooltip, Legend, LineElement, PointElement, Filler)

const { t } = useI18n()

definePageMeta({
  middleware: 'auth'
})

// Fetch holdings from API
const { data: holdings, pending } = await useLazyFetch<HoldingViewInput[]>('/api/stocks/holdings', {
  server: false,
  default: () => []
})

const searchQuery = ref('')
const debouncedSearchQuery = ref('')
const profitStatusFilter = ref<ProfitStatusFilter>('all')
const concentrationFilter = ref<ConcentrationFilter>('all')
const sortColumn = ref<StocksSortKey>('totalCost')
const sortDirection = ref<SortDirection>('desc')
const marketState = ref<string | null>(null)

watchDebounced(searchQuery, (val) => debouncedSearchQuery.value = val, { debounce: 300 })

const sortBy = (key: StocksSortKey) => {
  if (sortColumn.value === key) {
    sortDirection.value = sortDirection.value === 'asc' ? 'desc' : 'asc'
  } else {
    sortColumn.value = key
    sortDirection.value = 'desc'
  }
}

const sortedHoldings = computed(() => applyStocksView(holdings.value ?? [], {
  search: debouncedSearchQuery.value,
  profitStatus: profitStatusFilter.value,
  concentration: concentrationFilter.value,
  sortKey: sortColumn.value,
  sortDir: sortDirection.value
}))

const stats = computed(() => computePortfolioAggregations(holdings.value ?? []))
const totalHoldings = computed(() => stats.value.totalHoldings)
const totalCost = computed(() => stats.value.totalCost)
const currentMarketValue = computed(() => stats.value.currentMarketValue)
const unrealizedAmount = computed(() => stats.value.unrealizedAmount)
const totalUnrealizedPct = computed(() => stats.value.unrealizedPct)
const totalDayChange = computed(() => stats.value.totalDayChange)
const totalDayChangePercent = computed(() => stats.value.totalDayChangePercent)

const formatQuantity = (qty: number) => formatHoldingQuantity(qty)
const formatPercentage = (cost: number) => formatHoldingShare(cost, totalCost.value)

// Price fetching
const isFetchingPrices = ref(false)
const cooldownRemaining = ref(0)
let cooldownTimer: any = null

const fetchStockPrices = async () => {
  if (isFetchingPrices.value || cooldownRemaining.value > 0 || !holdings.value?.length) return
  isFetchingPrices.value = true
  try {
    const symbols = (holdings.value ?? []).map(h => h.symbol)
    const pricesData = await $fetch<Record<string, QuoteResponse>>('/api/stocks/prices', {
      method: 'POST',
      body: { symbols }
    })
    holdings.value = (holdings.value ?? []).map(h => {
      const quote = pricesData[h.symbol]
      if (!quote) return h
      if (!marketState.value) marketState.value = quote.marketState
      return { ...h, price: quote.regularMarketPrice, dayChange: quote.change, dayChangePercent: quote.changePercent }
    })
    cooldownRemaining.value = 30
    cooldownTimer = setInterval(() => {
      cooldownRemaining.value--
      if (cooldownRemaining.value <= 0) clearInterval(cooldownTimer)
    }, 1000)
  } finally {
    isFetchingPrices.value = false
  }
}

watch([pending, () => holdings.value?.length], ([isPending, count]) => {
  if (!isPending && count && count > 0 && !marketState.value) fetchStockPrices()
}, { immediate: true })

// Performance
type PerfPeriod = 'month' | 'quarter' | 'year'
const selectedPeriod = ref<PerfPeriod>('month')
const periodLabel = computed(() => ({ month: '月度', quarter: '季度', year: '年度' }[selectedPeriod.value]))
const { data: perfData, pending: perfPending, refresh: refreshPerf } = await useLazyFetch<any>(
  () => `/api/stats/performance?period=${selectedPeriod.value}`, 
  { server: false, default: () => null }
)
watch(selectedPeriod, () => refreshPerf())

const barChartData = computed(() => {
  const stats = perfData.value?.periodStats ?? []
  return {
    labels: stats.map((s: any) => s.period),
    datasets: [{
      data: stats.map((s: any) => s.realizedPnL),
      backgroundColor: stats.map((s: any) => s.realizedPnL >= 0 ? '#16A34A' : '#DC2626'),
      borderRadius: 0,
    }]
  }
})

const barChartOptions: any = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false } }, y: { grid: { color: 'rgba(0,0,0,0.05)' } } }
}

const equityCurveData = computed(() => {
  const curve = perfData.value?.equityCurve ?? []
  return {
    labels: curve.map((p: any) => p.date),
    datasets: [{
      data: curve.map((p: any) => p.cumPnL),
      borderColor: '#2563EB',
      backgroundColor: 'rgba(37, 99, 235, 0.05)',
      fill: true, tension: 0.1, borderWidth: 2, pointRadius: 0
    }]
  }
})

const equityCurveOptions: any = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { grid: { color: 'rgba(0,0,0,0.05)' } } }
}

// History Snapshots
const { data: snapshotsData, refresh: refreshSnapshots } = await useLazyFetch<any>('/api/stats/snapshots', { server: false })
const isSnapshotting = ref(false)
const createSnapshot = async () => {
  isSnapshotting.value = true
  try {
    await $fetch('/api/stats/snapshot', { method: 'POST' })
    await refreshSnapshots()
  } finally { isSnapshotting.value = false }
}

const historyChartData = computed(() => {
  const snaps = snapshotsData.value?.snapshots ?? []
  return {
    labels: snaps.map((s: any) => s.snapshotDate),
    datasets: [
      {
        label: 'Portfolio',
        data: snaps.map((s: any) => s.portfolioReturnPct),
        borderColor: '#2563EB',
        borderWidth: 2, tension: 0.1, pointRadius: 0
      },
      {
        label: snapshotsData.value?.benchmarkSymbol ?? 'SPY',
        data: snaps.map((s: any) => s.benchmarkReturnPct),
        borderColor: '#CA8A04',
        borderDash: [5, 5],
        borderWidth: 1.5, tension: 0.1, pointRadius: 0
      }
    ]
  }
})

const historyChartOptions: any = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: { grid: { display: false }, ticks: { maxTicksLimit: 8 } }, y: { grid: { color: 'rgba(0,0,0,0.05)' } } }
}

const isExporting = ref(false)
const exportTrades = async () => {
  isExporting.value = true
  try {
    const csv = await $fetch<string>('/api/stats/export-trades', { responseType: 'text' })
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `trades-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  } finally { isExporting.value = false }
}

useHead({ title: `${t('stock.dashboard.title')} - Investment Diary` })
</script>
