<script setup lang="ts">
import type { MarketRotationMonitorPayload, MarketRotationMonitorRow } from '~/lib/market-rotation/monitor'
import type { MaStatus, RotationSignal } from '~/lib/market-rotation/signal'
import type { MarketState } from '~/lib/market-rotation/state'
import type { BreadthCondition, BreadthConfirmation } from '~/lib/market-rotation/breadth'
import type { RankScope } from '~/lib/market-rotation/types'

type FilterKey = 'all' | 'turning_strong' | 'losing_momentum' | 'rank_up' | 'rank_down' | 'above_50d' | 'below_50d' | 'near_high' | 'extended'
type SortField = 'symbol' | 'sectorName' | 'lastPrice' | 'rsi14' | 'rsiDelta2W' | 'rotationRank' | 'rankDelta2W' | 'twoWeekPerformancePct' | 'percentFromHigh'

const scopeOptions: Array<{ key: RankScope; label: string; icon: string }> = [
  { key: 'sectors', label: 'US Sectors', icon: 'heroicons:squares-2x2' },
  { key: 'indexes', label: 'Index ETFs', icon: 'heroicons:chart-bar-square' },
  { key: 'core', label: 'Core ETFs', icon: 'heroicons:circle-stack' },
]

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'turning_strong', label: 'Turning Strong' },
  { key: 'losing_momentum', label: 'Losing Momentum' },
  { key: 'rank_up', label: 'Rank Up' },
  { key: 'rank_down', label: 'Rank Down' },
  { key: 'above_50d', label: 'Above 50d' },
  { key: 'below_50d', label: 'Below 50d' },
  { key: 'near_high', label: 'Near High' },
  { key: 'extended', label: 'Extended' },
]

const columns: Array<{ key: SortField; label: string; align?: 'left' | 'right' | 'center' }> = [
  { key: 'symbol', label: 'TICKER', align: 'left' },
  { key: 'sectorName', label: 'SECTOR', align: 'left' },
  { key: 'lastPrice', label: 'LAST', align: 'right' },
  { key: 'rsi14', label: 'RSI', align: 'right' },
  { key: 'rsiDelta2W', label: 'RSI Δ2W', align: 'right' },
  { key: 'rotationRank', label: 'RANK', align: 'right' },
  { key: 'rankDelta2W', label: 'RANK Δ2W', align: 'right' },
  { key: 'twoWeekPerformancePct', label: '2W %', align: 'right' },
  { key: 'percentFromHigh', label: '% HIGH', align: 'right' },
]

const activeScope = ref<RankScope>('sectors')
const activeFilter = ref<FilterKey>('all')
const sortBy = ref<SortField>('rotationRank')
const sortOrder = ref<'asc' | 'desc'>('asc')
const payload = ref<(MarketRotationMonitorPayload & { currentMarketSummary: string }) | null>(null)
const loading = ref(false)
const noData = ref(false)
const selectedRow = ref<MarketRotationMonitorRow | null>(null)
const lastRefreshAt = ref<Date | null>(null)
const toast = useToast()
const { t } = useI18n()

const allRows = computed(() => payload.value?.rows ?? [])

const filteredRows = computed(() => {
  const data = allRows.value.filter((row) => {
    switch (activeFilter.value) {
      case 'turning_strong':
        return row.signal === 'turning_strong'
      case 'losing_momentum':
        return row.signal === 'losing_momentum'
      case 'rank_up':
        return row.rankDelta2W != null && row.rankDelta2W > 0
      case 'rank_down':
        return row.rankDelta2W != null && row.rankDelta2W < 0
      case 'above_50d':
        return row.above50d === true
      case 'below_50d':
        return row.above50d === false
      case 'near_high':
        return row.percentFromHigh != null && row.percentFromHigh >= -3
      case 'extended':
        return row.signal === 'strong_but_extended'
          || (row.rsi14 != null && row.rsi14 >= 70 && row.percentFromHigh != null && row.percentFromHigh >= -3)
      default:
        return true
    }
  })

  return [...data].sort((a, b) => compareRows(a, b, sortBy.value, sortOrder.value))
})

const topImproving = computed(() => payload.value?.topImproving ?? [])
const bottomWeakening = computed(() => payload.value?.bottomWeakening ?? [])
const summary = computed(() => payload.value?.summary ?? null)
const currentMarketSummary = computed(() => payload.value?.currentMarketSummary ?? '')
const dataQuality = computed(() => payload.value?.dataQuality ?? null)

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatNumber(value: number | null | undefined, decimals = 2): string {
  const normalized = normalizeNumber(value)
  return normalized === null ? '--' : normalized.toFixed(decimals)
}

function formatPercent(value: number | null | undefined, decimals = 2): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return '--'
  const sign = normalized > 0 ? '+' : ''
  return `${sign}${normalized.toFixed(decimals)}%`
}

function formatRatio(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return '--'
  return `${Math.round(ratio * 100)}%`
}

function formatDateTime(value: Date | null): string {
  if (!value) return '--'
  return new Intl.DateTimeFormat('zh-Hant-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '--'
  return new Intl.DateTimeFormat('en-GB').format(new Date(value))
}

function deltaClass(value: number | null | undefined): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return 'text-dt-text-muted'
  if (normalized > 0) return 'text-emerald-700 dark:text-emerald-300'
  if (normalized < 0) return 'text-rose-700 dark:text-rose-300'
  return 'text-dt-text-soft'
}

function rsiClass(value: number | null | undefined): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return 'bg-dt-surface-strong text-dt-text-muted'
  if (normalized > 70) return 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200'
  if (normalized >= 50) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200'
  if (normalized >= 30) return 'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200'
  return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200'
}

function fromHighClass(value: number | null | undefined): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return 'text-dt-text-muted'
  if (normalized >= -3) return 'text-emerald-700 dark:text-emerald-300'
  if (normalized < -10) return 'text-rose-700 dark:text-rose-300'
  return 'text-dt-text-soft'
}

function marketStateTone(state: MarketState): 'success' | 'neutral' | 'warning' | 'danger' {
  switch (state) {
    case 'risk_on': return 'success'
    case 'neutral': return 'neutral'
    case 'defensive': return 'warning'
    case 'risk_off': return 'danger'
    default: return 'neutral'
  }
}

function marketStateLabel(state: MarketState): string {
  switch (state) {
    case 'risk_on': return 'Risk On'
    case 'neutral': return 'Neutral'
    case 'defensive': return 'Defensive'
    case 'risk_off': return 'Risk Off'
    default: return 'Unknown'
  }
}

function breadthConfirmationTone(confirmation: BreadthConfirmation): 'success' | 'neutral' | 'warning' | 'danger' {
  switch (confirmation) {
    case 'confirming': return 'success'
    case 'mixed': return 'warning'
    case 'warning': return 'danger'
    default: return 'neutral'
  }
}

function breadthConfirmationLabel(confirmation: BreadthConfirmation): string {
  return confirmation.charAt(0).toUpperCase() + confirmation.slice(1)
}

function breadthConditionLabel(condition: BreadthCondition): string {
  return condition.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function signalTone(signal: RotationSignal | null): 'success' | 'warning' | 'danger' | 'neutral' | 'accent' {
  switch (signal) {
    case 'turning_strong': return 'accent'
    case 'early_recovery': return 'success'
    case 'strong_but_extended': return 'warning'
    case 'losing_momentum': return 'warning'
    case 'breaking_down': return 'danger'
    case 'neutral': return 'neutral'
    default: return 'neutral'
  }
}

function signalLabel(signal: RotationSignal | null): string {
  if (!signal) return '--'
  return signal.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function maStatusTone(status: MaStatus): 'success' | 'warning' | 'danger' | 'neutral' | 'accent' {
  switch (status) {
    case 'bullish_stack': return 'success'
    case 'healthy_pullback': return 'accent'
    case 'recovering': return 'accent'
    case 'short_term_weakness': return 'warning'
    case 'breakdown': return 'danger'
    default: return 'neutral'
  }
}

function maStatusLabel(status: MaStatus): string {
  return status.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')
}

function sparklinePoints(row: MarketRotationMonitorRow): string {
  const values = row.twoWeekTrend.map(point => point.value)
  const numericValues = values.filter((value): value is number => value != null && Number.isFinite(value))
  if (numericValues.length < 2) return ''

  const min = Math.min(...numericValues)
  const max = Math.max(...numericValues)
  const range = max - min || 1
  const width = 96
  const height = 28
  const lastIndex = Math.max(values.length - 1, 1)

  return values
    .map((value, index) => {
      if (value == null || !Number.isFinite(value)) return null
      const x = (index / lastIndex) * width
      const y = height - ((value - min) / range) * height
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .filter((point): point is string => Boolean(point))
    .join(' ')
}

function getSortValue(row: MarketRotationMonitorRow, field: SortField): string | number {
  if (field === 'symbol' || field === 'sectorName') {
    return row[field] ?? ''
  }
  const value = row[field]
  return value == null ? Number.NEGATIVE_INFINITY : value
}

function compareRows(a: MarketRotationMonitorRow, b: MarketRotationMonitorRow, field: SortField, order: 'asc' | 'desc'): number {
  const aValue = getSortValue(a, field)
  const bValue = getSortValue(b, field)
  const direction = order === 'asc' ? 1 : -1

  if (typeof aValue === 'string' && typeof bValue === 'string') {
    return aValue.localeCompare(bValue) * direction
  }

  return (Number(aValue) - Number(bValue)) * direction
}

function handleSort(field: SortField): void {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortBy.value = field
  sortOrder.value = field === 'symbol' || field === 'sectorName' ? 'asc' : field === 'rotationRank' ? 'asc' : 'desc'
}

async function refreshBoard(): Promise<void> {
  loading.value = true
  noData.value = false
  selectedRow.value = null

  try {
    const data = await $fetch<MarketRotationMonitorPayload & { currentMarketSummary: string }>(
      '/api/market/rotation-monitor',
      {
        params: { scope: activeScope.value },
        timeout: 30000,
      },
    )
    payload.value = data
    lastRefreshAt.value = new Date()
  } catch (error: unknown) {
    const status = (error as { statusCode?: number }).statusCode
    if (status === 404) {
      noData.value = true
      payload.value = null
    } else {
      toast.error(t('tools.etf.board.fetchFailed'))
    }
  } finally {
    loading.value = false
  }
}

function selectScope(key: RankScope): void {
  activeScope.value = key
  activeFilter.value = 'all'
  refreshBoard()
}

function downloadText(filename: string, content: string, type: string): void {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportCsv(): void {
  const headers = ['Ticker', 'Sector', 'Last', 'RSI', 'RSI Delta 2W', 'Rank', 'Rank Delta 2W', '2W %', '2W Trend', '% From High', 'MA Status', 'Signal']
  const body = filteredRows.value.map(row => [
    row.symbol,
    row.sectorName ?? row.name,
    formatNumber(row.lastPrice),
    formatNumber(row.rsi14, 1),
    formatPercent(row.rsiDelta2W, 1),
    row.rotationRank ?? '--',
    row.rankDelta2W != null ? formatPercent(row.rankDelta2W) : '--',
    formatPercent(row.twoWeekPerformancePct),
    row.twoWeekTrend.map(point => point.value == null ? '--' : formatNumber(point.value, 2)).join(' '),
    formatPercent(row.percentFromHigh),
    maStatusLabel(row.maStatus),
    signalLabel(row.signal),
  ])
  const csv = [headers, ...body]
    .map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n')

  const dateLabel = dataQuality.value?.asOfDate.replaceAll('-', '/') ?? 'unknown'
  downloadText(`market-rotation-${dateLabel.replaceAll('/', '-')}.csv`, csv, 'text/csv;charset=utf-8')
}

async function copyTable(): Promise<void> {
  const text = filteredRows.value
    .map(row => `${row.symbol}\t${row.sectorName ?? row.name}\tRSI ${formatNumber(row.rsi14, 1)}\tRank ${row.rotationRank ?? '--'}\t${signalLabel(row.signal)}`)
    .join('\n')

  try {
    await navigator.clipboard.writeText(text)
    toast.success(t('tools.etf.board.copySuccess'))
  } catch {
    toast.error(t('tools.etf.board.copyFailed'))
  }
}

function exportPng(): void {
  const rowsMarkup = filteredRows.value.map(row => `
    <tr>
      <td>${row.symbol}</td>
      <td>${row.sectorName ?? row.name}</td>
      <td>${formatNumber(row.lastPrice)}</td>
      <td>${formatNumber(row.rsi14, 1)}</td>
      <td>${formatPercent(row.rsiDelta2W, 1)}</td>
      <td>${row.rotationRank ?? '--'}</td>
      <td>${row.rankDelta2W != null ? formatPercent(row.rankDelta2W) : '--'}</td>
      <td>${formatPercent(row.twoWeekPerformancePct)}</td>
      <td>${row.twoWeekTrend.map(point => point.value == null ? '--' : formatNumber(point.value, 1)).join(' ')}</td>
      <td>${formatPercent(row.percentFromHigh)}</td>
      <td>${maStatusLabel(row.maStatus)}</td>
      <td>${signalLabel(row.signal)}</td>
    </tr>
  `).join('')

  const width = 1400
  const height = Math.max(720, 150 + filteredRows.value.length * 42)
  const dateLabel = dataQuality.value ? formatDate(dataQuality.value.asOfDate) : '--'
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#0b1220;color:#f8fafc;font-family:Arial,'Noto Sans TC',sans-serif;padding:34px;box-sizing:border-box;">
      <div style="font-size:32px;font-weight:800;margin-bottom:6px;">Market Rotation Monitor</div>
      <div style="font-size:15px;color:#94a3b8;margin-bottom:22px;">${activeScope.value} (${dateLabel}) &middot; Sorted by ${sortBy.value.toUpperCase()}</div>
      <table style="width:100%;border-collapse:collapse;background:#111827;font-size:18px;">
        <thead><tr>
          ${['Ticker', 'Sector', 'Last', 'RSI', 'RSI Δ2W', 'Rank', 'Rank Δ2W', '2W %', '2W Trend', '% High', 'MA Status', 'Signal'].map(label => `<th style="border:1px solid #475569;background:#d9d9d9;color:#111827;padding:9px;text-align:center;">${label}</th>`).join('')}
        </tr></thead>
        <tbody>${rowsMarkup}</tbody>
      </table>
    </div>
  `
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${html}</foreignObject></svg>`
  const img = new Image()
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }))

  img.onload = () => {
    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const context = canvas.getContext('2d')
    if (!context) return
    context.drawImage(img, 0, 0)
    URL.revokeObjectURL(url)
    const link = document.createElement('a')
    const dateLabelFile = dataQuality.value?.asOfDate.replaceAll('-', '-') ?? 'unknown'
    link.download = `market-rotation-${dateLabelFile}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  img.src = url
}

onMounted(refreshBoard)

useHead({
  title: 'Market Rotation Monitor - 投資工具',
  meta: [
    {
      name: 'description',
      content: '每日 Market Rotation Monitor，追蹤 sector rotation score、rank、signal 和 breadth。',
    },
  ],
})

definePageMeta({
  requiresAuth: false,
})
</script>

<template>
  <div class="min-h-screen bg-dt-bg px-4 py-6 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl space-y-6">
      <!-- Hero section -->
      <section class="overflow-hidden rounded-dt-lg border border-dt-border bg-dt-surface shadow-dt-md">
        <div class="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div class="min-w-0">
            <div class="mb-5 inline-flex items-center gap-2 rounded-dt-pill border border-dt-border bg-dt-surface-strong px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-dt-primary">
              <Icon name="heroicons:bolt" class="h-4 w-4" />
              Daily Market Rotation
            </div>
            <h1 class="text-4xl font-black leading-tight text-dt-text sm:text-5xl lg:text-6xl">
              Market Rotation Monitor
            </h1>
            <p class="mt-4 max-w-3xl text-base leading-7 text-dt-text-soft sm:text-lg">
              辨識 Market State、Sector Breadth 和 sector leadership changes。透過 rotation score、rank delta 和 canonical signals 追蹤 2 週市場輪動趨勢。
            </p>
          </div>

          <LedgerCard class="grid content-start gap-3">
            <div class="flex items-center justify-between gap-3 border-b border-dt-border pb-3 text-sm">
              <span class="text-dt-text-soft">核心畫面</span>
              <strong class="text-right text-dt-text">Rotation Matrix Table</strong>
            </div>
            <div class="flex items-center justify-between gap-3 border-b border-dt-border pb-3 text-sm">
              <span class="text-dt-text-soft">主要排序</span>
              <strong class="text-right text-dt-text">Rotation Rank</strong>
            </div>
            <div class="flex items-center justify-between gap-3 border-b border-dt-border pb-3 text-sm">
              <span class="text-dt-text-soft">重點訊號</span>
              <strong class="text-right text-dt-text">Rotation Signals</strong>
            </div>
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-dt-text-soft">最後刷新</span>
              <strong class="text-right text-dt-text">{{ formatDateTime(lastRefreshAt) }}</strong>
            </div>
          </LedgerCard>
        </div>
      </section>

      <MarketbeeSection />

      <!-- No data state -->
      <div v-if="noData" class="rounded-dt-lg border border-amber-300 bg-amber-50 p-6 text-center dark:border-amber-400/20 dark:bg-amber-400/10">
        <Icon name="heroicons:exclamation-triangle" class="mx-auto h-8 w-8 text-amber-600 dark:text-amber-400" />
        <p class="mt-3 text-sm font-semibold text-amber-800 dark:text-amber-200">
          No rotation snapshots found for scope "{{ activeScope }}". Run the batch job first.
        </p>
      </div>

      <template v-else>
        <!-- Dashboard summary cards + current market summary -->
        <section v-if="summary" class="grid gap-4 lg:grid-cols-[1fr_320px]">
          <LedgerCard>
            <div class="mb-4 flex items-center gap-2">
              <Icon name="heroicons:document-text" class="h-5 w-5 text-dt-primary" />
              <h2 class="text-sm font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                Current Market Summary
              </h2>
            </div>
            <p class="text-base leading-7 text-dt-text">
              {{ currentMarketSummary }}
            </p>
            <div v-if="dataQuality" class="mt-4 flex flex-wrap items-center gap-3 border-t border-dt-border pt-3 text-xs text-dt-text-muted">
              <span>As of {{ formatDate(dataQuality.asOfDate) }}</span>
              <span v-if="dataQuality.comparisonDate">·</span>
              <span v-if="dataQuality.comparisonDate">vs {{ formatDate(dataQuality.comparisonDate) }}</span>
              <span>·</span>
              <span>{{ dataQuality.rowCount }} symbols</span>
              <span>·</span>
              <span>{{ dataQuality.completeSignalCount }} complete signals</span>
            </div>
          </LedgerCard>

          <div class="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div class="rounded-dt-md border border-dt-border bg-dt-surface p-4">
              <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">Market State</p>
              <div class="mt-2 flex items-center gap-2">
                <StatusBadge v-if="summary" :tone="marketStateTone(summary.marketState)">
                  {{ marketStateLabel(summary.marketState) }}
                </StatusBadge>
                <StatusBadge v-if="summary" :tone="breadthConfirmationTone(summary.breadthConfirmation)">
                  {{ breadthConfirmationLabel(summary.breadthConfirmation) }}
                </StatusBadge>
              </div>
              <p class="mt-2 text-xs text-dt-text-soft">{{ breadthConditionLabel(summary.breadthCondition) }} breadth</p>
            </div>
            <div class="rounded-dt-md border border-dt-border bg-dt-surface p-4">
              <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">Average RSI</p>
              <strong class="mt-1 block text-2xl font-black text-dt-text">{{ formatNumber(summary.averageRsi, 1) }}</strong>
            </div>
          </div>
        </section>

        <!-- Top improving / Bottom weakening -->
        <section v-if="topImproving.length > 0 || bottomWeakening.length > 0" class="grid gap-4 lg:grid-cols-2">
          <LedgerCard>
            <div class="mb-4 flex items-center gap-2">
              <Icon name="heroicons:arrow-trending-up" class="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <h2 class="text-sm font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                Top Improving
              </h2>
            </div>
            <div class="space-y-2">
              <div
                v-for="row in topImproving"
                :key="`improving-${row.symbol}`"
                class="flex cursor-pointer items-center justify-between gap-3 rounded-dt-md border border-dt-border bg-dt-bg p-3 transition hover:bg-dt-surface-strong"
                @click="selectedRow = row"
              >
                <div class="min-w-0">
                  <p class="font-mono text-sm font-bold text-dt-text">{{ row.symbol }}</p>
                  <p class="truncate text-xs text-dt-text-muted">{{ row.sectorName ?? row.name }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300">
                    +{{ row.rankDelta2W }}
                  </span>
                  <span class="text-xs text-dt-text-muted">Rank #{{ row.rotationRank }}</span>
                </div>
              </div>
            </div>
          </LedgerCard>

          <LedgerCard>
            <div class="mb-4 flex items-center gap-2">
              <Icon name="heroicons:arrow-trending-down" class="h-5 w-5 text-rose-600 dark:text-rose-400" />
              <h2 class="text-sm font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                Bottom Weakening
              </h2>
            </div>
            <div class="space-y-2">
              <div
                v-for="row in bottomWeakening"
                :key="`weakening-${row.symbol}`"
                class="flex cursor-pointer items-center justify-between gap-3 rounded-dt-md border border-dt-border bg-dt-bg p-3 transition hover:bg-dt-surface-strong"
                @click="selectedRow = row"
              >
                <div class="min-w-0">
                  <p class="font-mono text-sm font-bold text-dt-text">{{ row.symbol }}</p>
                  <p class="truncate text-xs text-dt-text-muted">{{ row.sectorName ?? row.name }}</p>
                </div>
                <div class="flex items-center gap-3">
                  <span class="font-mono text-sm font-bold text-rose-700 dark:text-rose-300">
                    {{ row.rankDelta2W }}
                  </span>
                  <span class="text-xs text-dt-text-muted">Rank #{{ row.rotationRank }}</span>
                </div>
              </div>
            </div>
          </LedgerCard>
        </section>

        <!-- Control panel + board -->
        <section class="grid gap-4 lg:grid-cols-[280px_1fr]">
          <!-- Control panel sidebar -->
          <LedgerCard>
            <div class="mb-4 flex items-center justify-between gap-3">
              <h2 class="text-sm font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                Control Panel
              </h2>
              <BaseButton
                variant="ghost"
                :disabled="loading"
                aria-label="Refresh rotation monitor"
                class="!h-10 !w-10 !min-w-0 !rounded-full !px-0"
                @click="refreshBoard"
              >
                <Icon name="heroicons:arrow-path" class="h-5 w-5" :class="{ 'animate-spin': loading }" />
              </BaseButton>
            </div>

            <div class="grid gap-2">
              <button
                v-for="scope in scopeOptions"
                :key="scope.key"
                type="button"
                class="flex min-h-11 items-center gap-2 rounded-dt-md border px-3 py-2 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                :class="activeScope === scope.key ? 'border-dt-primary bg-dt-primary text-white' : 'border-dt-border bg-dt-surface text-dt-text-soft hover:bg-dt-surface-strong'"
                @click="selectScope(scope.key)"
              >
                <Icon :name="scope.icon" class="h-4 w-4 shrink-0" />
                <span class="min-w-0 truncate">{{ scope.label }}</span>
              </button>
            </div>

            <div class="mt-5 border-t border-dt-border pt-5">
              <h3 class="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                Filter
              </h3>
              <div class="flex flex-wrap gap-2">
                <button
                  v-for="filter in filters"
                  :key="filter.key"
                  type="button"
                  class="rounded-dt-pill border px-3 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-dt-primary/30"
                  :class="activeFilter === filter.key ? 'border-dt-primary bg-dt-primary text-white' : 'border-dt-border bg-dt-surface text-dt-text-soft hover:bg-dt-surface-strong'"
                  @click="activeFilter = filter.key"
                >
                  {{ filter.label }}
                </button>
              </div>
            </div>

            <div class="mt-5 grid gap-2 border-t border-dt-border pt-5">
              <BaseButton variant="primary" @click="exportPng">
                <Icon name="heroicons:photo" class="h-4 w-4" />
                Export PNG
              </BaseButton>
              <BaseButton variant="secondary" @click="exportCsv">
                <Icon name="heroicons:document-arrow-down" class="h-4 w-4" />
                Export CSV
              </BaseButton>
              <BaseButton variant="secondary" @click="copyTable">
                <Icon name="heroicons:clipboard-document" class="h-4 w-4" />
                Copy Table
              </BaseButton>
            </div>
          </LedgerCard>

          <!-- Main board -->
          <main class="min-w-0 rounded-dt-lg border border-dt-border bg-dt-surface shadow-dt-sm">
            <div class="border-b border-dt-border p-4 sm:p-5">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div class="min-w-0">
                  <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                    Rotation Matrix
                  </p>
                  <h2 class="mt-1 text-2xl font-black capitalize text-dt-text">
                    {{ activeScope }} ({{ dataQuality ? formatDate(dataQuality.asOfDate) : '--' }})
                  </h2>
                </div>
                <div v-if="summary" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div class="rounded-dt-md border border-dt-border bg-dt-bg p-3">
                    <strong class="block text-xl text-dt-text">{{ summary.above20d.count }} / {{ summary.above20d.total }}</strong>
                    <span class="text-xs text-dt-text-muted">Above 20d ({{ formatRatio(summary.above20d.ratio) }})</span>
                  </div>
                  <div class="rounded-dt-md border border-dt-border bg-dt-bg p-3">
                    <strong class="block text-xl text-dt-text">{{ summary.above50d.count }} / {{ summary.above50d.total }}</strong>
                    <span class="text-xs text-dt-text-muted">Above 50d ({{ formatRatio(summary.above50d.ratio) }})</span>
                  </div>
                  <div class="rounded-dt-md border border-dt-border bg-dt-bg p-3">
                    <strong class="block text-xl text-dt-text">{{ formatNumber(summary.averageRsi, 1) }}</strong>
                    <span class="text-xs text-dt-text-muted">Average RSI</span>
                  </div>
                  <div class="rounded-dt-md border border-dt-border bg-dt-bg p-3">
                    <strong class="block text-xl capitalize text-dt-text">{{ marketStateLabel(summary.marketState) }}</strong>
                    <span class="text-xs text-dt-text-muted">Market State</span>
                  </div>
                </div>
              </div>
            </div>

            <div v-if="loading && !payload" class="grid min-h-[420px] place-items-center p-6">
              <div class="text-center">
                <Icon name="heroicons:arrow-path" class="mx-auto h-9 w-9 animate-spin text-dt-primary" />
                <p class="mt-3 text-sm font-semibold text-dt-text-soft">{{ t('tools.etf.board.loading') }}</p>
              </div>
            </div>

            <template v-else-if="payload">
              <!-- Desktop table -->
              <div class="hidden overflow-x-auto md:block">
                <table class="w-full min-w-[1200px] border-collapse text-sm">
                  <caption class="bg-dt-bg px-4 py-2 text-left text-lg font-black text-dt-text">
                    Rotation Matrix · Rank Sorted
                  </caption>
                  <thead class="sticky top-0 z-10 bg-dt-surface-muted text-dt-text">
                    <tr>
                      <template v-for="column in columns" :key="column.key">
                        <th
                          scope="col"
                          class="sticky top-0 z-10 cursor-pointer border border-dt-border-strong bg-dt-surface-muted px-3 py-2 text-xs font-black uppercase tracking-[0.04em] transition hover:bg-dt-surface-strong"
                          :class="column.align === 'right' ? 'text-right' : column.align === 'center' ? 'text-center' : 'text-left'"
                          @click="handleSort(column.key)"
                        >
                          <span class="inline-flex items-center gap-1">
                            {{ column.label }}
                            <Icon
                              v-if="sortBy === column.key"
                              :name="sortOrder === 'asc' ? 'heroicons:chevron-up' : 'heroicons:chevron-down'"
                              class="h-3.5 w-3.5"
                            />
                          </span>
                        </th>
                        <th
                          v-if="column.key === 'twoWeekPerformancePct'"
                          scope="col"
                          class="sticky top-0 z-10 border border-dt-border-strong bg-dt-surface-muted px-3 py-2 text-center text-xs font-black uppercase tracking-[0.04em]"
                        >
                          2W Trend
                        </th>
                      </template>
                      <th scope="col" class="sticky top-0 z-10 border border-dt-border-strong bg-dt-surface-muted px-3 py-2 text-center text-xs font-black uppercase tracking-[0.04em]">
                        MA Status
                      </th>
                      <th scope="col" class="sticky top-0 z-10 border border-dt-border-strong bg-dt-surface-muted px-3 py-2 text-center text-xs font-black uppercase tracking-[0.04em]">
                        Signal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in filteredRows"
                      :key="row.symbol"
                      class="cursor-pointer border-b border-dt-border transition hover:bg-dt-surface-strong"
                      @click="selectedRow = row"
                    >
                      <td class="border border-dt-border px-3 py-2 font-black text-dt-text">{{ row.symbol }}</td>
                      <td class="border border-dt-border px-3 py-2 text-dt-text-soft">{{ row.sectorName ?? row.name }}</td>
                      <td class="border border-dt-border px-3 py-2 text-right font-mono text-dt-text">{{ formatNumber(row.lastPrice) }}</td>
                      <td class="border border-dt-border px-3 py-2 text-right">
                        <span class="inline-flex min-w-14 justify-center rounded-dt-pill px-2 py-1 text-xs font-black" :class="rsiClass(row.rsi14)">
                          {{ formatNumber(row.rsi14, 1) }}
                        </span>
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-right font-mono font-bold" :class="deltaClass(row.rsiDelta2W)">
                        {{ formatPercent(row.rsiDelta2W, 1) }}
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-right font-mono font-black text-dt-text">
                        {{ row.rotationRank != null ? `#${row.rotationRank}` : '--' }}
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-right font-mono font-bold" :class="deltaClass(row.rankDelta2W)">
                        {{ row.rankDelta2W != null ? formatPercent(row.rankDelta2W) : '--' }}
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-right font-mono font-bold" :class="deltaClass(row.twoWeekPerformancePct)">
                        {{ formatPercent(row.twoWeekPerformancePct) }}
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-center">
                        <svg
                          v-if="sparklinePoints(row)"
                          viewBox="0 0 96 28"
                          class="mx-auto h-7 w-24 overflow-visible"
                          role="img"
                          :aria-label="`${row.symbol} 2W normalized trend`"
                        >
                          <polyline
                            :points="sparklinePoints(row)"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2.5"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                            :class="deltaClass(row.twoWeekPerformancePct)"
                          />
                        </svg>
                        <span v-else class="text-xs text-dt-text-muted">--</span>
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-right font-mono font-bold" :class="fromHighClass(row.percentFromHigh)">
                        {{ formatPercent(row.percentFromHigh) }}
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-center">
                        <StatusBadge :tone="maStatusTone(row.maStatus)">
                          {{ maStatusLabel(row.maStatus) }}
                        </StatusBadge>
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-center">
                        <StatusBadge :tone="signalTone(row.signal)">
                          {{ signalLabel(row.signal) }}
                        </StatusBadge>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <!-- Mobile cards -->
              <div class="space-y-3 p-4 md:hidden">
                <EtfMobileCard
                  v-for="row in filteredRows"
                  :key="row.symbol"
                  :row="row"
                  @click="selectedRow = row"
                />
              </div>
            </template>
          </main>
        </section>
      </template>
    </div>

    <!-- Detail modal -->
    <div
      v-if="selectedRow"
      class="fixed inset-0 z-40 bg-dt-bg/60 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      @click.self="selectedRow = null"
    >
      <aside class="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-dt-lg border border-dt-border bg-dt-surface shadow-dt-lg">
        <div class="flex items-start justify-between gap-4 border-b border-dt-border p-5">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">ETF Detail</p>
            <h2 class="text-2xl font-black text-dt-text">{{ selectedRow.symbol }}</h2>
            <p class="text-sm text-dt-text-muted">{{ selectedRow.sectorName ?? selectedRow.name }}</p>
          </div>
          <BaseButton
            variant="ghost"
            aria-label="Close ETF detail"
            class="!h-10 !w-10 !min-w-0 !rounded-full !px-0"
            @click="selectedRow = null"
          >
            <Icon name="heroicons:x-mark" class="h-5 w-5" />
          </BaseButton>
        </div>

        <div class="grid gap-3 overflow-y-auto p-5">
          <LedgerCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">Last Price</p>
                <p class="mt-1 text-3xl font-black text-dt-text">{{ formatNumber(selectedRow.lastPrice) }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">Rotation Rank</p>
                <p class="mt-1 text-3xl font-black text-dt-text">{{ selectedRow.rotationRank != null ? `#${selectedRow.rotationRank}` : '--' }}</p>
              </div>
            </div>
          </LedgerCard>

          <LedgerCard>
            <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">Signal</p>
            <div class="mt-2 flex items-center gap-2">
              <StatusBadge :tone="signalTone(selectedRow.signal)">
                {{ signalLabel(selectedRow.signal) }}
              </StatusBadge>
              <span class="text-xs text-dt-text-muted">{{ selectedRow.signalStatus === 'complete' ? 'Complete data' : 'Insufficient data' }}</span>
            </div>
          </LedgerCard>

          <div class="grid grid-cols-2 gap-3">
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">RSI 14</p>
              <p class="mt-1 text-xl font-black text-dt-text">{{ formatNumber(selectedRow.rsi14, 1) }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">RSI Delta 2W</p>
              <p class="mt-1 text-xl font-black" :class="deltaClass(selectedRow.rsiDelta2W)">{{ formatPercent(selectedRow.rsiDelta2W, 1) }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">Rank Delta 2W</p>
              <p class="mt-1 text-xl font-black" :class="deltaClass(selectedRow.rankDelta2W)">{{ selectedRow.rankDelta2W != null ? formatPercent(selectedRow.rankDelta2W) : '--' }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">2W Performance</p>
              <p class="mt-1 text-xl font-black" :class="deltaClass(selectedRow.twoWeekPerformancePct)">{{ formatPercent(selectedRow.twoWeekPerformancePct) }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">% From High</p>
              <p class="mt-1 text-xl font-black" :class="fromHighClass(selectedRow.percentFromHigh)">{{ formatPercent(selectedRow.percentFromHigh) }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">Rotation Score</p>
              <p class="mt-1 text-xl font-black text-dt-text">{{ formatNumber(selectedRow.rotationScore, 1) }}</p>
            </LedgerCard>
          </div>

          <LedgerCard>
            <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">MA Status</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge :tone="maStatusTone(selectedRow.maStatus)">
                {{ maStatusLabel(selectedRow.maStatus) }}
              </StatusBadge>
              <span class="text-xs text-dt-text-muted">Above 20d: {{ selectedRow.above20d === true ? 'Yes' : selectedRow.above20d === false ? 'No' : 'N/A' }}</span>
              <span class="text-xs text-dt-text-muted">Above 50d: {{ selectedRow.above50d === true ? 'Yes' : selectedRow.above50d === false ? 'No' : 'N/A' }}</span>
            </div>
          </LedgerCard>
        </div>
      </aside>
    </div>
  </div>
</template>
