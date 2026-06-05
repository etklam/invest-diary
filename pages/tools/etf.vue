<script setup lang="ts">
import {
  buildSparklinePoints,
  type MaStatus,
  type SectorTrendRow,
} from '~/lib/etf-sector-trend'

type PresetKey = 'sectors' | 'indexes' | 'custom'
type FilterKey = 'all' | 'aboveAll' | 'belowShort' | 'belowAll' | 'hotRsi' | 'weakRsi'
type SortField = 'symbol' | 'sector' | 'rsi' | 'last' | 'dailyChange' | 'weeklyChange' | 'ytdHighDistance'

const presetOptions: Array<{ key: PresetKey; label: string; icon: string }> = [
  { key: 'sectors', label: 'US Sectors', icon: 'heroicons:squares-2x2' },
  { key: 'indexes', label: 'Index ETFs', icon: 'heroicons:chart-bar-square' },
  { key: 'custom', label: 'Custom', icon: 'heroicons:pencil-square' },
]

const filters: Array<{ key: FilterKey; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'aboveAll', label: 'Above All MAs' },
  { key: 'belowShort', label: 'Below 10d & 20d' },
  { key: 'belowAll', label: 'Below All MAs' },
  { key: 'hotRsi', label: 'RSI > 70' },
  { key: 'weakRsi', label: 'RSI < 40' },
]

const columns: Array<{ key: SortField; label: string; align?: 'left' | 'right' | 'center' }> = [
  { key: 'symbol', label: 'TICKER', align: 'left' },
  { key: 'sector', label: 'SECTOR', align: 'left' },
  { key: 'rsi', label: 'RSI', align: 'right' },
  { key: 'last', label: 'LAST', align: 'right' },
  { key: 'dailyChange', label: '% CHG', align: 'right' },
  { key: 'weeklyChange', label: 'WEEKLY % CHG', align: 'right' },
  { key: 'ytdHighDistance', label: 'YTD % HIGH', align: 'right' },
]

const activePreset = ref<PresetKey>('sectors')
const activeFilter = ref<FilterKey>('all')
const sortBy = ref<SortField>('rsi')
const sortOrder = ref<'asc' | 'desc'>('desc')
const rows = ref<SectorTrendRow[]>([])
const loading = ref(false)
const forceRefresh = ref(false)
const selectedRow = ref<SectorTrendRow | null>(null)
const customSymbols = ref('SMH, SOXX, IBB, IYR')
const lastRefreshAt = ref<Date | null>(null)
const boardRef = ref<HTMLElement | null>(null)
const toast = useToast()
const { t } = useI18n()

const validRows = computed(() => rows.value.filter(row => !row.error && row.last !== null))

const filteredRows = computed(() => {
  const data = validRows.value.filter((row) => {
    if (activeFilter.value === 'aboveAll') {
      return row.ema10Status === 'ABOVE' && row.ema20Status === 'ABOVE' && row.sma50Status === 'ABOVE'
    }
    if (activeFilter.value === 'belowShort') {
      return row.ema10Status === 'BELOW' && row.ema20Status === 'BELOW'
    }
    if (activeFilter.value === 'belowAll') {
      return row.ema10Status === 'BELOW' && row.ema20Status === 'BELOW' && row.sma50Status === 'BELOW'
    }
    if (activeFilter.value === 'hotRsi') {
      return (row.rsi ?? 0) > 70
    }
    if (activeFilter.value === 'weakRsi') {
      return (row.rsi ?? 100) < 40
    }
    return true
  })

  return [...data].sort((a, b) => compareRows(a, b, sortBy.value, sortOrder.value))
})

const failedRows = computed(() => rows.value.filter(row => row.error))

const boardStats = computed(() => {
  const total = validRows.value.length
  const countAbove = (field: 'ema10Status' | 'ema20Status' | 'sma50Status') =>
    validRows.value.filter(row => row[field] === 'ABOVE').length
  const rsiValues = validRows.value.map(row => row.rsi).filter((value): value is number => typeof value === 'number')
  const avgRsi = rsiValues.length
    ? rsiValues.reduce((sum, value) => sum + value, 0) / rsiValues.length
    : null

  return {
    total,
    above10: countAbove('ema10Status'),
    above20: countAbove('ema20Status'),
    above50: countAbove('sma50Status'),
    avgRsi,
  }
})

const boardDateLabel = computed(() => {
  const latest = validRows.value
    .map(row => row.latestDate)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1)

  if (!latest) return 'Loading'
  return new Intl.DateTimeFormat('en-GB').format(new Date(latest))
})

function normalizeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function formatNumber(value: number | null | undefined, decimals = 2) {
  const normalized = normalizeNumber(value)
  return normalized === null ? '--' : normalized.toFixed(decimals)
}

function formatPercent(value: number | null | undefined, decimals = 2) {
  const normalized = normalizeNumber(value)
  if (normalized === null) return '--'
  const sign = normalized > 0 ? '+' : ''
  return `${sign}${normalized.toFixed(decimals)}%`
}

function formatDateTime(value: Date | null) {
  if (!value) return '--'
  return new Intl.DateTimeFormat('zh-Hant-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function percentClass(value: number | null | undefined) {
  const normalized = normalizeNumber(value)
  if (normalized === null) return 'text-slate-500 dark:text-slate-400'
  if (normalized > 0) return 'text-emerald-700 dark:text-emerald-300'
  if (normalized < 0) return 'text-rose-700 dark:text-rose-300'
  return 'text-slate-600 dark:text-slate-300'
}

function rsiClass(value: number | null | undefined) {
  const normalized = normalizeNumber(value)
  if (normalized === null) return 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
  if (normalized > 70) return 'bg-amber-100 text-amber-800 dark:bg-amber-400/15 dark:text-amber-200'
  if (normalized >= 50) return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-200'
  if (normalized >= 30) return 'bg-rose-100 text-rose-800 dark:bg-rose-400/15 dark:text-rose-200'
  return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-400/15 dark:text-indigo-200'
}

function statusClass(status: MaStatus | null) {
  if (status === 'ABOVE') return 'bg-emerald-200 text-emerald-950 dark:bg-emerald-400/25 dark:text-emerald-100'
  if (status === 'BELOW') return 'bg-rose-200 text-rose-950 dark:bg-rose-400/25 dark:text-rose-100'
  return 'bg-slate-100 text-slate-500 dark:bg-white/5 dark:text-slate-400'
}

function getSortValue(row: SectorTrendRow, field: SortField) {
  if (field === 'symbol' || field === 'sector') return row[field]
  return row[field] ?? Number.NEGATIVE_INFINITY
}

function compareRows(a: SectorTrendRow, b: SectorTrendRow, field: SortField, order: 'asc' | 'desc') {
  const aValue = getSortValue(a, field)
  const bValue = getSortValue(b, field)
  const direction = order === 'asc' ? 1 : -1

  if (typeof aValue === 'string' && typeof bValue === 'string') {
    return aValue.localeCompare(bValue) * direction
  }

  return (Number(aValue) - Number(bValue)) * direction
}

function handleSort(field: SortField) {
  if (sortBy.value === field) {
    sortOrder.value = sortOrder.value === 'asc' ? 'desc' : 'asc'
    return
  }

  sortBy.value = field
  sortOrder.value = field === 'symbol' || field === 'sector' ? 'asc' : 'desc'
}

async function refreshBoard() {
  loading.value = true
  selectedRow.value = null

  try {
    const params: Record<string, string> = { preset: activePreset.value }
    if (activePreset.value === 'custom') {
      params.symbols = customSymbols.value
    }
    if (forceRefresh.value) {
      params.nocache = '1'
      forceRefresh.value = false
    }

    const data = await $fetch<{ rows: SectorTrendRow[] }>('/api/market/sector-board', {
      params,
      timeout: 30000,
    })
    rows.value = data.rows
    lastRefreshAt.value = new Date()

    if (failedRows.value.length > 0) {
      toast.error(t('tools.etf.board.partialFetchFailed', { count: failedRows.value.length }))
    }
  } catch {
    toast.error(t('tools.etf.board.fetchFailed'))
  } finally {
    loading.value = false
  }
}

function selectPreset(key: PresetKey) {
  activePreset.value = key
  activeFilter.value = 'all'
  refreshBoard()
}

function downloadText(filename: string, content: string, type: string) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function exportCsv() {
  const headers = ['TICKER', 'SECTOR', 'RSI', 'LAST', '% CHG', 'WEEKLY % CHG', '10d EMA', '20d EMA', '50d SMA', 'YTD % HIGH']
  const body = filteredRows.value.map(row => [
    row.symbol,
    row.sector,
    formatNumber(row.rsi),
    formatNumber(row.last),
    formatPercent(row.dailyChange),
    formatPercent(row.weeklyChange),
    row.ema10Status ?? '--',
    row.ema20Status ?? '--',
    row.sma50Status ?? '--',
    formatPercent(row.ytdHighDistance),
  ])
  const csv = [headers, ...body]
    .map(line => line.map(value => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n')

  downloadText(`sector-trend-board-${boardDateLabel.value.replaceAll('/', '-')}.csv`, csv, 'text/csv;charset=utf-8')
}

async function copyTable() {
  const text = filteredRows.value
    .map(row => `${row.symbol}\t${row.sector}\tRSI ${formatNumber(row.rsi)}\t${formatPercent(row.dailyChange)}\t${row.ema10Status}/${row.ema20Status}/${row.sma50Status}`)
    .join('\n')

  try {
    await navigator.clipboard.writeText(text)
    toast.success(t('tools.etf.board.copySuccess'))
  } catch {
    toast.error(t('tools.etf.board.copyFailed'))
  }
}

function exportPng() {
  const rowsMarkup = filteredRows.value.map(row => `
    <tr>
      <td>${row.symbol}</td>
      <td>${row.sector}</td>
      <td>${formatNumber(row.rsi)}</td>
      <td>${formatNumber(row.last)}</td>
      <td>${formatPercent(row.dailyChange)}</td>
      <td>${formatPercent(row.weeklyChange)}</td>
      <td>${row.ema10Status ?? '--'}</td>
      <td>${row.ema20Status ?? '--'}</td>
      <td>${row.sma50Status ?? '--'}</td>
      <td>${formatPercent(row.ytdHighDistance)}</td>
    </tr>
  `).join('')

  const width = 1280
  const height = Math.max(720, 150 + filteredRows.value.length * 42)
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#0b1220;color:#f8fafc;font-family:Arial,'Noto Sans TC',sans-serif;padding:34px;box-sizing:border-box;">
      <div style="font-size:32px;font-weight:800;margin-bottom:6px;">ETF Sector Trend Board</div>
      <div style="font-size:15px;color:#94a3b8;margin-bottom:22px;">Sectors (${boardDateLabel.value}) · Sorted by ${sortBy.value.toUpperCase()}</div>
      <table style="width:100%;border-collapse:collapse;background:#111827;font-size:18px;">
        <thead><tr>
          ${['TICKER', 'SECTOR', 'RSI', 'LAST', '% CHG', 'WEEKLY % CHG', '10d EMA', '20d EMA', '50d SMA', 'YTD % HIGH'].map(label => `<th style="border:1px solid #475569;background:#d9d9d9;color:#111827;padding:9px;text-align:center;">${label}</th>`).join('')}
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
    link.download = `sector-trend-board-${boardDateLabel.value.replaceAll('/', '-')}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }
  img.src = url
}

onMounted(refreshBoard)

useHead({
  title: 'ETF Sector Trend Board - 投資工具',
  meta: [
    {
      name: 'description',
      content: '每日 ETF sector matrix，追蹤 RSI、漲跌幅、EMA/SMA 位置與距離 YTD 高位幅度。',
    },
  ],
})

definePageMeta({
  requiresAuth: false,
})
</script>

<template>
  <div class="min-h-screen bg-slate-50 px-4 py-6 dark:bg-slate-950 sm:px-6 lg:px-8">
    <div class="mx-auto max-w-7xl space-y-6">
      <section class="overflow-hidden rounded-3xl border border-slate-200 bg-slate-950 text-white shadow-lg dark:border-white/10">
        <div class="grid gap-6 p-6 lg:grid-cols-[1.05fr_0.95fr] lg:p-8">
          <div class="min-w-0">
            <div class="mb-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-sky-200">
              <Icon name="heroicons:bolt" class="h-4 w-4" />
              Daily Market Snapshot
            </div>
            <h1 class="text-4xl font-black leading-tight text-white sm:text-5xl lg:text-6xl">
              ETF Sector Trend Board
            </h1>
            <p class="mt-4 max-w-3xl text-base leading-7 text-slate-300 sm:text-lg">
              一打開就看主要 ETF / sector 的強弱、RSI、均線位置和距離高位幅度。主流程是比較市場輪動，不是再輸入一隻 ticker 慢慢猜。
            </p>
          </div>

          <div class="grid content-start gap-3 rounded-2xl border border-white/10 bg-white/[0.06] p-4">
            <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm">
              <span class="text-slate-300">核心畫面</span>
              <strong class="text-right text-white">Sector Matrix Table</strong>
            </div>
            <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm">
              <span class="text-slate-300">主要排序</span>
              <strong class="text-right text-white">RSI High to Low</strong>
            </div>
            <div class="flex items-center justify-between gap-3 border-b border-white/10 pb-3 text-sm">
              <span class="text-slate-300">重點訊號</span>
              <strong class="text-right text-white">ABOVE / BELOW MA</strong>
            </div>
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-slate-300">最後刷新</span>
              <strong class="text-right text-white">{{ formatDateTime(lastRefreshAt) }}</strong>
            </div>
          </div>
        </div>
      </section>

      <MarketbeeSection />

      <section class="grid gap-4 lg:grid-cols-[280px_1fr]">
        <aside class="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div class="mb-4 flex items-center justify-between gap-3">
            <h2 class="text-sm font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              Control Panel
            </h2>
            <button
              type="button"
              class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              :disabled="loading"
              aria-label="Refresh sector board"
              @click="forceRefresh = true; refreshBoard()"
            >
              <Icon name="heroicons:arrow-path" class="h-5 w-5" :class="{ 'animate-spin': loading }" />
            </button>
          </div>

          <div class="grid gap-2">
            <button
              v-for="preset in presetOptions"
              :key="preset.key"
              type="button"
              class="flex min-h-11 items-center gap-2 rounded-xl border px-3 py-2 text-left text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
              :class="activePreset === preset.key ? 'border-slate-950 bg-slate-950 text-white dark:border-white dark:bg-white dark:text-slate-950' : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/10'"
              @click="selectPreset(preset.key)"
            >
              <Icon :name="preset.icon" class="h-4 w-4 shrink-0" />
              <span class="min-w-0 truncate">{{ preset.label }}</span>
            </button>
          </div>

          <div v-if="activePreset === 'custom'" class="mt-4">
            <label for="custom-etfs" class="mb-2 block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Custom ETF symbols
            </label>
            <textarea
              id="custom-etfs"
              v-model="customSymbols"
              rows="4"
              class="w-full resize-none rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-white/10 dark:bg-slate-950 dark:text-white"
              @blur="refreshBoard"
            />
          </div>

          <div class="mt-5 border-t border-slate-200 pt-5 dark:border-white/10">
            <h3 class="mb-3 text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
              Filter
            </h3>
            <div class="flex flex-wrap gap-2">
              <button
                v-for="filter in filters"
                :key="filter.key"
                type="button"
                class="rounded-full border px-3 py-1.5 text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-indigo-500"
                :class="activeFilter === filter.key ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50 dark:border-white/10 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-white/10'"
                @click="activeFilter = filter.key"
              >
                {{ filter.label }}
              </button>
            </div>
          </div>

          <div class="mt-5 grid gap-2 border-t border-slate-200 pt-5 dark:border-white/10">
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-bold text-white transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-white dark:text-slate-950 dark:hover:bg-slate-200"
              @click="exportPng"
            >
              <Icon name="heroicons:photo" class="h-4 w-4" />
              Export PNG
            </button>
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              @click="exportCsv"
            >
              <Icon name="heroicons:document-arrow-down" class="h-4 w-4" />
              Export CSV
            </button>
            <button
              type="button"
              class="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
              @click="copyTable"
            >
              <Icon name="heroicons:clipboard-document" class="h-4 w-4" />
              Copy Table
            </button>
          </div>
        </aside>

        <main ref="boardRef" class="min-w-0 rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-slate-900">
          <div class="border-b border-slate-200 p-4 dark:border-white/10 sm:p-5">
            <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
              <div class="min-w-0">
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
                  Main Board
                </p>
                <h2 class="mt-1 text-2xl font-black text-slate-950 dark:text-white">
                  Sectors ({{ boardDateLabel }})
                </h2>
              </div>
              <div class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <strong class="block text-xl text-slate-950 dark:text-white">{{ boardStats.above10 }} / {{ boardStats.total }}</strong>
                  <span class="text-xs text-slate-500 dark:text-slate-400">Above 10d EMA</span>
                </div>
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <strong class="block text-xl text-slate-950 dark:text-white">{{ boardStats.above20 }} / {{ boardStats.total }}</strong>
                  <span class="text-xs text-slate-500 dark:text-slate-400">Above 20d EMA</span>
                </div>
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <strong class="block text-xl text-slate-950 dark:text-white">{{ boardStats.above50 }} / {{ boardStats.total }}</strong>
                  <span class="text-xs text-slate-500 dark:text-slate-400">Above 50d SMA</span>
                </div>
                <div class="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-white/10 dark:bg-white/5">
                  <strong class="block text-xl text-slate-950 dark:text-white">{{ formatNumber(boardStats.avgRsi, 1) }}</strong>
                  <span class="text-xs text-slate-500 dark:text-slate-400">Average RSI</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="loading && rows.length === 0" class="grid min-h-[420px] place-items-center p-6">
            <div class="text-center">
              <Icon name="heroicons:arrow-path" class="mx-auto h-9 w-9 animate-spin text-indigo-500" />
              <p class="mt-3 text-sm font-semibold text-slate-600 dark:text-slate-300">{{ t('tools.etf.board.loading') }}</p>
            </div>
          </div>

          <div v-else class="overflow-x-auto">
            <table class="w-full min-w-[1040px] border-collapse text-sm">
              <caption class="bg-slate-950 px-4 py-2 text-left text-lg font-black text-white">
                Sector Matrix · RSI Sorted
              </caption>
              <thead class="sticky top-0 z-10 bg-slate-200 text-slate-950">
                <tr>
                  <th
                    v-for="column in columns"
                    :key="column.key"
                    scope="col"
                    class="sticky top-0 z-10 cursor-pointer border border-slate-500 bg-slate-200 px-3 py-2 text-xs font-black uppercase tracking-[0.04em] transition hover:bg-slate-300"
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
                  <th scope="col" class="sticky top-0 z-10 border border-slate-500 bg-slate-200 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.04em]">
                    10d EMA
                  </th>
                  <th scope="col" class="sticky top-0 z-10 border border-slate-500 bg-slate-200 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.04em]">
                    20d EMA
                  </th>
                  <th scope="col" class="sticky top-0 z-10 border border-slate-500 bg-slate-200 px-3 py-2 text-center text-xs font-black uppercase tracking-[0.04em]">
                    50d SMA
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in filteredRows"
                  :key="row.symbol"
                  class="cursor-pointer border-b border-slate-200 transition hover:bg-sky-50 dark:border-white/10 dark:hover:bg-white/5"
                  @click="selectedRow = row"
                >
                  <td class="border border-slate-300 px-3 py-2 font-black text-slate-950 dark:border-white/10 dark:text-white">{{ row.symbol }}</td>
                  <td class="border border-slate-300 px-3 py-2 text-slate-700 dark:border-white/10 dark:text-slate-300">{{ row.sector }}</td>
                  <td class="border border-slate-300 px-3 py-2 text-right dark:border-white/10">
                    <span class="inline-flex min-w-14 justify-center rounded-full px-2 py-1 text-xs font-black" :class="rsiClass(row.rsi)">
                      {{ formatNumber(row.rsi) }}
                    </span>
                  </td>
                  <td class="border border-slate-300 px-3 py-2 text-right font-mono text-slate-950 dark:border-white/10 dark:text-white">{{ formatNumber(row.last) }}</td>
                  <td class="border border-slate-300 px-3 py-2 text-right font-mono font-bold dark:border-white/10" :class="percentClass(row.dailyChange)">
                    {{ formatPercent(row.dailyChange) }}
                  </td>
                  <td class="border border-slate-300 px-3 py-2 text-right font-mono font-bold dark:border-white/10" :class="percentClass(row.weeklyChange)">
                    {{ formatPercent(row.weeklyChange) }}
                  </td>
                  <td class="border border-slate-300 px-3 py-2 text-right font-mono font-bold dark:border-white/10" :class="percentClass(row.ytdHighDistance)">
                    {{ formatPercent(row.ytdHighDistance) }}
                  </td>
                  <td class="border border-slate-300 px-3 py-2 text-center dark:border-white/10">
                    <span class="inline-flex min-w-20 justify-center rounded px-2 py-1 text-xs font-black" :class="statusClass(row.ema10Status)">{{ row.ema10Status ?? '--' }}</span>
                  </td>
                  <td class="border border-slate-300 px-3 py-2 text-center dark:border-white/10">
                    <span class="inline-flex min-w-20 justify-center rounded px-2 py-1 text-xs font-black" :class="statusClass(row.ema20Status)">{{ row.ema20Status ?? '--' }}</span>
                  </td>
                  <td class="border border-slate-300 px-3 py-2 text-center dark:border-white/10">
                    <span class="inline-flex min-w-20 justify-center rounded px-2 py-1 text-xs font-black" :class="statusClass(row.sma50Status)">{{ row.sma50Status ?? '--' }}</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="failedRows.length > 0" class="border-t border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800 dark:border-amber-400/20 dark:bg-amber-400/10 dark:text-amber-200">
            {{ t('tools.etf.board.failedSymbols', { symbols: failedRows.map(row => row.symbol).join(', ') }) }}
          </div>
        </main>
      </section>
    </div>

    <div
      v-if="selectedRow"
      class="fixed inset-0 z-40 bg-slate-950/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      @click.self="selectedRow = null"
    >
      <aside class="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl dark:border-white/10 dark:bg-slate-900">
        <div class="flex items-start justify-between gap-4 border-b border-slate-200 p-5 dark:border-white/10">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">ETF Detail</p>
            <h2 class="text-2xl font-black text-slate-950 dark:text-white">{{ selectedRow.symbol }}</h2>
            <p class="text-sm text-slate-500 dark:text-slate-400">{{ selectedRow.sector }}</p>
          </div>
          <button
            type="button"
            class="inline-flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-600 transition hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/10"
            aria-label="Close ETF detail"
            @click="selectedRow = null"
          >
            <Icon name="heroicons:x-mark" class="h-5 w-5" />
          </button>
        </div>

        <div class="grid gap-3 overflow-y-auto p-5">
          <div class="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/5">
            <p class="text-xs font-bold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">Last Price</p>
            <p class="mt-1 text-3xl font-black text-slate-950 dark:text-white">{{ formatNumber(selectedRow.last) }}</p>
            <p class="mt-1 font-mono text-sm font-bold" :class="percentClass(selectedRow.dailyChange)">
              {{ formatPercent(selectedRow.dailyChange) }} daily
            </p>
          </div>

          <div class="rounded-xl border border-slate-200 bg-slate-950 p-4 text-white dark:border-white/10">
            <div class="mb-3 flex items-center justify-between gap-3">
              <p class="text-xs font-bold uppercase tracking-[0.08em] text-slate-400">Mini Chart</p>
              <span class="font-mono text-xs text-slate-400">{{ selectedRow.recentCloses.length }} closes</span>
            </div>
            <svg
              v-if="selectedRow.recentCloses.length >= 2"
              viewBox="0 0 320 96"
              class="h-24 w-full overflow-visible"
              role="img"
              :aria-label="`${selectedRow.symbol} recent close sparkline`"
            >
              <line x1="8" y1="88" x2="312" y2="88" class="stroke-white/10" stroke-width="1" />
              <polyline
                :points="buildSparklinePoints(selectedRow.recentCloses)"
                fill="none"
                class="stroke-emerald-300"
                stroke-width="3"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
            <p v-else class="py-8 text-center text-sm font-semibold text-slate-400">
              {{ t('tools.etf.board.noChartData') }}
            </p>
          </div>

          <div class="grid grid-cols-2 gap-3">
            <div class="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <p class="text-xs text-slate-500 dark:text-slate-400">RSI 14</p>
              <p class="mt-1 text-xl font-black text-slate-950 dark:text-white">{{ formatNumber(selectedRow.rsi) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <p class="text-xs text-slate-500 dark:text-slate-400">Weekly Change</p>
              <p class="mt-1 text-xl font-black" :class="percentClass(selectedRow.weeklyChange)">{{ formatPercent(selectedRow.weeklyChange) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <p class="text-xs text-slate-500 dark:text-slate-400">10d EMA</p>
              <p class="mt-1 text-xl font-black text-slate-950 dark:text-white">{{ formatNumber(selectedRow.ema10) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <p class="text-xs text-slate-500 dark:text-slate-400">20d EMA</p>
              <p class="mt-1 text-xl font-black text-slate-950 dark:text-white">{{ formatNumber(selectedRow.ema20) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <p class="text-xs text-slate-500 dark:text-slate-400">50d SMA</p>
              <p class="mt-1 text-xl font-black text-slate-950 dark:text-white">{{ formatNumber(selectedRow.sma50) }}</p>
            </div>
            <div class="rounded-xl border border-slate-200 p-4 dark:border-white/10">
              <p class="text-xs text-slate-500 dark:text-slate-400">YTD % High</p>
              <p class="mt-1 text-xl font-black" :class="percentClass(selectedRow.ytdHighDistance)">{{ formatPercent(selectedRow.ytdHighDistance) }}</p>
            </div>
          </div>
        </div>
      </aside>
    </div>
  </div>
</template>
