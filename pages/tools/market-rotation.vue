<script setup lang="ts">
import type { MarketRotationMonitorPayload, MarketRotationMonitorRow } from '~/lib/market-rotation/monitor'
import type { MaStatus, RotationSignal } from '~/lib/market-rotation/signal'
import { isNearHigh } from '~/lib/market-rotation/signal'
import type { MarketState } from '~/lib/market-rotation/state'
import type { BreadthCondition, BreadthConfirmation } from '~/lib/market-rotation/breadth'
import type { RankScope } from '~/lib/market-rotation/types'
import { formatSignedPercent } from '~/lib/format'
import { useResearchCapture } from '~/composables/useResearchCapture'

type FilterKey = 'all' | 'turning_strong' | 'losing_momentum' | 'rank_up' | 'rank_down' | 'above_50d' | 'below_50d' | 'near_high' | 'extended'
type SortField = 'symbol' | 'sectorName' | 'lastPrice' | 'rsi14' | 'rsiDelta2W' | 'rotationRank' | 'rankDelta2W' | 'twoWeekPerformancePct' | 'percentFromHigh'

const activeScope = ref<RankScope>('sectors')
const activeFilter = ref<FilterKey>('all')
const sortBy = ref<SortField>('rotationRank')
const sortOrder = ref<'asc' | 'desc'>('asc')
const payload = ref<MarketRotationMonitorPayload | null>(null)
const loading = ref(false)
const noData = ref(false)
const selectedRow = ref<MarketRotationMonitorRow | null>(null)
const lastRefreshAt = ref<Date | null>(null)
const toast = useToast()
const { t, locale } = useI18n()

const scopeOptions = computed<Array<{ key: RankScope; label: string; icon: string }>>(() => [
  { key: 'sectors', label: t('marketRotation.scopes.sectors'), icon: 'heroicons:squares-2x2' },
  { key: 'indexes', label: t('marketRotation.scopes.indexes'), icon: 'heroicons:chart-bar-square' },
])

const filters = computed<Array<{ key: FilterKey; label: string }>>(() => [
  { key: 'all', label: t('marketRotation.filters.all') },
  { key: 'turning_strong', label: t('marketRotation.filters.turning_strong') },
  { key: 'losing_momentum', label: t('marketRotation.filters.losing_momentum') },
  { key: 'rank_up', label: t('marketRotation.filters.rank_up') },
  { key: 'rank_down', label: t('marketRotation.filters.rank_down') },
  { key: 'above_50d', label: t('marketRotation.filters.above_50d') },
  { key: 'below_50d', label: t('marketRotation.filters.below_50d') },
  { key: 'near_high', label: t('marketRotation.filters.near_high') },
  { key: 'extended', label: t('marketRotation.filters.extended') },
])

const columns = computed<Array<{ key: SortField; label: string; align?: 'left' | 'right' | 'center' }>>(() => [
  { key: 'symbol', label: t('marketRotation.columns.ticker'), align: 'left' },
  { key: 'sectorName', label: t('marketRotation.columns.sector'), align: 'left' },
  { key: 'lastPrice', label: t('marketRotation.columns.last'), align: 'right' },
  { key: 'rsi14', label: t('marketRotation.columns.rsi'), align: 'right' },
  { key: 'rsiDelta2W', label: t('marketRotation.columns.rsiDelta2W'), align: 'right' },
  { key: 'rotationRank', label: t('marketRotation.columns.rank'), align: 'right' },
  { key: 'rankDelta2W', label: t('marketRotation.columns.rankDelta2W'), align: 'right' },
  { key: 'twoWeekPerformancePct', label: t('marketRotation.columns.performance2W'), align: 'right' },
  { key: 'percentFromHigh', label: t('marketRotation.columns.fromHigh'), align: 'right' },
])

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
        return isNearHigh(row.percentFromHigh)
      case 'extended':
        return row.signal === 'strong_but_extended'
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
const researchCapture = useResearchCapture()

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
  return formatSignedPercent(normalized, decimals)
}

function formatPointDelta(value: number | null | undefined, decimals = 1): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return '--'
  const sign = normalized > 0 ? '+' : ''
  return `${sign}${normalized.toFixed(decimals)} pts`
}

function formatRankDelta(value: number | null | undefined): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return '--'
  if (normalized > 0) return `+${normalized.toFixed(0)} ranks`
  if (normalized < 0) return `${normalized.toFixed(0)} ranks`
  return '0 ranks'
}

function formatRatio(ratio: number | null | undefined): string {
  if (ratio == null || !Number.isFinite(ratio)) return '--'
  return `${Math.round(ratio * 100)}%`
}

function formatDateTime(value: Date | null): string {
  if (!value) return '--'
  return new Intl.DateTimeFormat(locale.value || 'zh-TW', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(value)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '--'
  return new Intl.DateTimeFormat(locale.value || 'zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(value))
}

function deltaClass(value: number | null | undefined): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return 'text-dt-text-muted'
  if (normalized > 0) return 'text-dt-success'
  if (normalized < 0) return 'text-dt-danger'
  return 'text-dt-text-soft'
}

function rsiClass(value: number | null | undefined): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return 'bg-dt-surface-strong text-dt-text-muted'
  if (normalized > 70) return 'bg-dt-warning/15 text-dt-warning'
  if (normalized >= 50) return 'bg-dt-success/15 text-dt-success'
  if (normalized >= 30) return 'bg-dt-danger/15 text-dt-danger'
  return 'bg-dt-primary/15 text-dt-primary'
}

function fromHighClass(value: number | null | undefined): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return 'text-dt-text-muted'
  if (normalized >= -3) return 'text-dt-success'
  if (normalized < -10) return 'text-dt-danger'
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
  return t(`marketRotation.marketStates.${state}`)
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
  return t(`marketRotation.breadthConfirmations.${confirmation}`)
}

function breadthConditionLabel(condition: BreadthCondition): string {
  return t(`marketRotation.breadthConditions.${condition}`)
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
  return signal ? t(`marketRotation.signals.${signal}`) : t('marketRotation.common.notAvailable')
}

function captureRankDelta(value: number | null | undefined): string {
  const normalized = normalizeNumber(value)
  if (normalized === null) return t('marketRotation.common.notAvailable')
  return `${normalized > 0 ? '+' : ''}${normalized.toFixed(0)}`
}

function buildMarketRotationCaptureContext(row: MarketRotationMonitorRow | null = null) {
  const asOfDate = dataQuality.value?.asOfDate ?? new Date().toISOString()
  const sourceTitle = t('researchCapture.sources.marketRotation')

  if (!row) {
    return {
      sourceLabel: sourceTitle,
      suggestedInsight: currentMarketSummary.value || t('researchCapture.context.marketRotationSummary'),
      metadata: {
        sourceType: 'MARKET_ROTATION' as const,
        sourceTitle,
        occurredAt: asOfDate,
        metadataJson: JSON.stringify({
          scope: activeScope.value,
          marketSummary: currentMarketSummary.value,
          asOfDate,
        }),
      },
    }
  }

  const subject = row.sectorName ?? row.name
  const suggestedInsight = [
    row.signal === 'turning_strong' || row.signal === 'early_recovery'
      ? t('researchCapture.context.marketRotationImproving', { subject })
      : t('researchCapture.context.marketRotationObservation', { subject, signal: signalLabel(row.signal) }),
    '',
    row.symbol,
    t('researchCapture.context.signal', { value: signalLabel(row.signal) }),
    t('researchCapture.context.rotationRank', { value: row.rotationRank == null ? t('marketRotation.common.notAvailable') : row.rotationRank }),
    t('researchCapture.context.rankChange2W', { value: captureRankDelta(row.rankDelta2W) }),
    t('researchCapture.context.performance2W', { value: formatPercent(row.twoWeekPerformancePct, 1) }),
  ].join('\n')

  return {
    sourceLabel: `${sourceTitle} · ${row.symbol}`,
    suggestedInsight,
    metadata: {
      sourceType: 'MARKET_ROTATION' as const,
      sourceTitle,
      occurredAt: asOfDate,
      metadataJson: JSON.stringify({
        symbol: row.symbol,
        sectorName: subject,
        signal: row.signal,
        rotationRank: row.rotationRank,
        rankDelta2W: row.rankDelta2W,
        twoWeekPerformancePct: row.twoWeekPerformancePct,
        maStatus: row.maStatus,
        asOfDate,
      }),
    },
    ...(row.groupType === 'sector' ? {} : { symbolPrefill: row.symbol }),
  }
}

function openMarketRotationCapture(row: MarketRotationMonitorRow | null = null): void {
  researchCapture.open(buildMarketRotationCaptureContext(row))
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
  return t(`marketRotation.maStatuses.${status}`)
}

function scopeLabel(scope: RankScope): string {
  return t(`marketRotation.scopes.${scope}`)
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
    const data = await $fetch<MarketRotationMonitorPayload>(
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

function getExportHeaders(): string[] {
  return [
    t('marketRotation.export.ticker'),
    t('marketRotation.export.sector'),
    t('marketRotation.export.last'),
    t('marketRotation.export.rsi'),
    t('marketRotation.export.rsiDelta2W'),
    t('marketRotation.export.rank'),
    t('marketRotation.export.rankDelta2W'),
    t('marketRotation.export.performance2W'),
    t('marketRotation.export.trend2W'),
    t('marketRotation.export.fromHigh'),
    t('marketRotation.export.maStatus'),
    t('marketRotation.export.signal'),
  ]
}

function exportCsv(): void {
  const metadataRows = [
    [t('marketRotation.export.marketSummary'), currentMarketSummary.value],
    [t('marketRotation.export.marketState'), summary.value ? marketStateLabel(summary.value.marketState) : t('marketRotation.common.notAvailable')],
    [t('marketRotation.export.breadthCondition'), summary.value ? breadthConditionLabel(summary.value.breadthCondition) : t('marketRotation.common.notAvailable')],
    [t('marketRotation.export.breadthConfirmation'), summary.value ? breadthConfirmationLabel(summary.value.breadthConfirmation) : t('marketRotation.common.notAvailable')],
    [t('marketRotation.export.asOfDate'), dataQuality.value?.asOfDate ?? t('marketRotation.common.notAvailable')],
    [t('marketRotation.export.comparisonDate'), dataQuality.value?.comparisonDate ?? t('marketRotation.common.notAvailable')],
    [t('marketRotation.export.rankScope'), dataQuality.value?.rankScope ?? activeScope.value],
  ]
  const headers = getExportHeaders()
  const body = filteredRows.value.map(row => [
    row.symbol,
    row.sectorName ?? row.name,
    formatNumber(row.lastPrice),
    formatNumber(row.rsi14, 1),
    formatPointDelta(row.rsiDelta2W),
    row.rotationRank ?? '--',
    formatRankDelta(row.rankDelta2W),
    formatPercent(row.twoWeekPerformancePct),
    row.twoWeekTrend.map(point => point.value == null ? '--' : formatNumber(point.value, 2)).join(' '),
    formatPercent(row.percentFromHigh),
    maStatusLabel(row.maStatus),
    signalLabel(row.signal),
  ])
  const csv = [...metadataRows, [], headers, ...body]
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
      <td>${formatPointDelta(row.rsiDelta2W)}</td>
      <td>${row.rotationRank ?? '--'}</td>
      <td>${formatRankDelta(row.rankDelta2W)}</td>
      <td>${formatPercent(row.twoWeekPerformancePct)}</td>
      <td>${row.twoWeekTrend.map(point => point.value == null ? '--' : formatNumber(point.value, 1)).join(' ')}</td>
      <td>${formatPercent(row.percentFromHigh)}</td>
      <td>${maStatusLabel(row.maStatus)}</td>
      <td>${signalLabel(row.signal)}</td>
    </tr>
  `).join('')

  const width = 1400
  const height = Math.max(760, 250 + filteredRows.value.length * 42)
  const dateLabel = dataQuality.value ? formatDate(dataQuality.value.asOfDate) : '--'
  const metadataMarkup = `
    <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px;margin:18px 0 18px 0;font-size:15px;">
      <div style="background:#111827;border:1px solid #334155;padding:10px;"><b>${t('marketRotation.export.marketState')}</b><br/>${summary.value ? marketStateLabel(summary.value.marketState) : t('marketRotation.common.notAvailable')}</div>
      <div style="background:#111827;border:1px solid #334155;padding:10px;"><b>${t('marketRotation.export.breadthCondition')}</b><br/>${summary.value ? breadthConditionLabel(summary.value.breadthCondition) : t('marketRotation.common.notAvailable')}</div>
      <div style="background:#111827;border:1px solid #334155;padding:10px;"><b>${t('marketRotation.export.breadthConfirmation')}</b><br/>${summary.value ? breadthConfirmationLabel(summary.value.breadthConfirmation) : t('marketRotation.common.notAvailable')}</div>
      <div style="background:#111827;border:1px solid #334155;padding:10px;"><b>${t('marketRotation.export.rankScope')}</b><br/>${dataQuality.value?.rankScope ?? activeScope.value}</div>
    </div>
    <div style="font-size:16px;line-height:1.5;color:#cbd5e1;margin-bottom:16px;"><b>${t('marketRotation.export.summaryPrefix')}</b> ${currentMarketSummary.value || t('marketRotation.common.notAvailable')}</div>
    <div style="font-size:14px;color:#94a3b8;margin-bottom:18px;">${t('marketRotation.export.asOfDate')} ${dataQuality.value?.asOfDate ?? t('marketRotation.common.notAvailable')} &middot; ${t('marketRotation.export.comparisonDate')} ${dataQuality.value?.comparisonDate ?? t('marketRotation.common.notAvailable')}</div>
  `
  const html = `
    <div xmlns="http://www.w3.org/1999/xhtml" style="width:${width}px;height:${height}px;background:#0b1220;color:#f8fafc;font-family:Arial,'Noto Sans TC',sans-serif;padding:34px;box-sizing:border-box;">
      <div style="font-size:32px;font-weight:800;margin-bottom:6px;">${t('marketRotation.export.title')}</div>
      <div style="font-size:15px;color:#94a3b8;margin-bottom:22px;">${activeScope.value} (${dateLabel}) &middot; ${t('marketRotation.export.sortedBy')} ${sortBy.value.toUpperCase()}</div>
      ${metadataMarkup}
      <table style="width:100%;border-collapse:collapse;background:#111827;font-size:18px;">
        <thead><tr>
          ${getExportHeaders().map(label => `<th style="border:1px solid #475569;background:#d9d9d9;color:#111827;padding:9px;text-align:center;">${label}</th>`).join('')}
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
  title: () => `${t('marketRotation.title')} - ${t('nav.tools')}`,
  meta: [
    {
      name: 'description',
      content: () => t('marketRotation.description'),
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
              {{ t('marketRotation.badge') }}
            </div>
            <h1 class="text-4xl font-black leading-tight text-dt-text sm:text-5xl lg:text-6xl">
              {{ t('marketRotation.title') }}
            </h1>
            <p class="mt-4 max-w-3xl text-base leading-7 text-dt-text-soft sm:text-lg">
              {{ t('marketRotation.description') }}
            </p>
          </div>

          <LedgerCard class="grid content-start gap-3">
            <div class="flex items-center justify-between gap-3 border-b border-dt-border pb-3 text-sm">
              <span class="text-dt-text-soft">{{ t('marketRotation.hero.coreViewLabel') }}</span>
              <strong class="text-right text-dt-text">{{ t('marketRotation.hero.coreView') }}</strong>
            </div>
            <div class="flex items-center justify-between gap-3 border-b border-dt-border pb-3 text-sm">
              <span class="text-dt-text-soft">{{ t('marketRotation.hero.primarySortLabel') }}</span>
              <strong class="text-right text-dt-text">{{ t('marketRotation.hero.primarySort') }}</strong>
            </div>
            <div class="flex items-center justify-between gap-3 border-b border-dt-border pb-3 text-sm">
              <span class="text-dt-text-soft">{{ t('marketRotation.hero.keySignalsLabel') }}</span>
              <strong class="text-right text-dt-text">{{ t('marketRotation.hero.keySignals') }}</strong>
            </div>
            <div class="flex items-center justify-between gap-3 text-sm">
              <span class="text-dt-text-soft">{{ t('marketRotation.hero.lastRefresh') }}</span>
              <strong class="text-right text-dt-text">{{ formatDateTime(lastRefreshAt) }}</strong>
            </div>
          </LedgerCard>
        </div>
      </section>

      <!-- No data state -->
      <div v-if="noData" class="rounded-dt-lg border border-dt-warning/30 bg-dt-warning/10 p-6 text-center">
        <Icon name="heroicons:exclamation-triangle" class="mx-auto h-8 w-8 text-dt-warning" />
        <p class="mt-3 text-sm font-semibold text-dt-warning">
          {{ t('marketRotation.summary.noSnapshots', { scope: scopeLabel(activeScope) }) }}
        </p>
      </div>

      <template v-else>
        <!-- Dashboard summary cards + current market summary -->
        <section v-if="summary" class="grid gap-4 lg:grid-cols-[1fr_320px]">
          <LedgerCard>
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
              <Icon name="heroicons:document-text" class="h-5 w-5 text-dt-primary" />
              <h2 class="text-sm font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                {{ t('marketRotation.summary.currentTitle') }}
              </h2>
              </div>
              <BaseButton v-if="researchCapture.canCapture.value" variant="secondary" class="!min-h-10 !px-3 !py-2 text-xs" @click="openMarketRotationCapture()">
                {{ t('researchCapture.captureInsight') }}
              </BaseButton>
            </div>
            <p class="text-base leading-7 text-dt-text">
              {{ currentMarketSummary }}
            </p>
            <div v-if="dataQuality" class="mt-4 flex flex-wrap items-center gap-3 border-t border-dt-border pt-3 text-xs text-dt-text-muted">
              <span>{{ t('marketRotation.summary.asOf', { date: formatDate(dataQuality.asOfDate) }) }}</span>
              <span v-if="dataQuality.comparisonDate">·</span>
              <span v-if="dataQuality.comparisonDate">{{ t('marketRotation.summary.vs', { date: formatDate(dataQuality.comparisonDate) }) }}</span>
              <span>·</span>
              <span>{{ t('marketRotation.summary.symbols', { count: dataQuality.rowCount }) }}</span>
              <span>·</span>
              <span>{{ t('marketRotation.summary.completeSignals', { count: dataQuality.completeSignalCount }) }}</span>
            </div>
          </LedgerCard>

          <div class="grid grid-cols-2 gap-3 lg:grid-cols-1">
            <div class="rounded-dt-md border border-dt-border bg-dt-surface p-4">
              <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('marketRotation.summary.marketState') }}</p>
              <div class="mt-2 flex items-center gap-2">
                <StatusBadge v-if="summary" :tone="marketStateTone(summary.marketState)">
                  {{ marketStateLabel(summary.marketState) }}
                </StatusBadge>
                <StatusBadge v-if="summary" :tone="breadthConfirmationTone(summary.breadthConfirmation)">
                  {{ breadthConfirmationLabel(summary.breadthConfirmation) }}
                </StatusBadge>
              </div>
              <p class="mt-2 text-xs text-dt-text-soft">{{ t('marketRotation.summary.breadth', { condition: breadthConditionLabel(summary.breadthCondition) }) }}</p>
            </div>
            <div class="rounded-dt-md border border-dt-border bg-dt-surface p-4">
              <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('marketRotation.summary.averageRsi') }}</p>
              <strong class="mt-1 block text-2xl font-black text-dt-text">{{ formatNumber(summary.averageRsi, 1) }}</strong>
            </div>
          </div>
        </section>

        <!-- Top improving / Bottom weakening -->
        <section v-if="topImproving.length > 0 || bottomWeakening.length > 0" class="grid gap-4 lg:grid-cols-2">
          <LedgerCard>
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <Icon name="heroicons:arrow-trending-up" class="h-5 w-5 text-dt-success" />
                <h2 class="text-sm font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                  {{ t('marketRotation.summary.topImproving') }}
                </h2>
              </div>
              <BaseButton v-if="researchCapture.canCapture.value" variant="secondary" class="!min-h-10 !px-3 !py-2 text-xs" @click="openMarketRotationCapture(topImproving[0] ?? null)">
                {{ t('researchCapture.captureInsight') }}
              </BaseButton>
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
                  <span class="font-mono text-sm font-bold text-dt-success">
                    +{{ row.rankDelta2W }}
                  </span>
                  <span class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.rank', { rank: row.rotationRank }) }}</span>
                </div>
              </div>
            </div>
          </LedgerCard>

          <LedgerCard>
            <div class="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div class="flex items-center gap-2">
                <Icon name="heroicons:arrow-trending-down" class="h-5 w-5 text-dt-danger" />
                <h2 class="text-sm font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                  {{ t('marketRotation.summary.bottomWeakening') }}
                </h2>
              </div>
              <BaseButton v-if="researchCapture.canCapture.value" variant="secondary" class="!min-h-10 !px-3 !py-2 text-xs" @click="openMarketRotationCapture(bottomWeakening[0] ?? null)">
                {{ t('researchCapture.captureInsight') }}
              </BaseButton>
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
                  <span class="font-mono text-sm font-bold text-dt-danger">
                    {{ row.rankDelta2W }}
                  </span>
                  <span class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.rank', { rank: row.rotationRank }) }}</span>
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
                {{ t('marketRotation.summary.controlPanel') }}
              </h2>
              <BaseButton
                variant="ghost"
                :disabled="loading"
                :aria-label="t('marketRotation.summary.refreshAria')"
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
                {{ t('marketRotation.summary.filter') }}
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
                {{ t('marketRotation.summary.exportPng') }}
              </BaseButton>
              <BaseButton variant="secondary" @click="exportCsv">
                <Icon name="heroicons:document-arrow-down" class="h-4 w-4" />
                {{ t('marketRotation.summary.exportCsv') }}
              </BaseButton>
              <BaseButton variant="secondary" @click="copyTable">
                <Icon name="heroicons:clipboard-document" class="h-4 w-4" />
                {{ t('marketRotation.summary.copyTable') }}
              </BaseButton>
            </div>
          </LedgerCard>

          <!-- Main board -->
          <main class="min-w-0 rounded-dt-lg border border-dt-border bg-dt-surface shadow-dt-sm">
            <div class="border-b border-dt-border p-4 sm:p-5">
              <div class="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                <div class="min-w-0">
                  <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">
                    {{ t('marketRotation.summary.rotationMatrix') }}
                  </p>
                  <h2 class="mt-1 text-2xl font-black capitalize text-dt-text">
                    {{ scopeLabel(activeScope) }} ({{ dataQuality ? formatDate(dataQuality.asOfDate) : t('marketRotation.common.notAvailable') }})
                  </h2>
                </div>
                <div v-if="summary" class="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  <div class="rounded-dt-md border border-dt-border bg-dt-bg p-3">
                    <strong class="block text-xl text-dt-text">{{ summary.above20d.count }} / {{ summary.above20d.total }}</strong>
                    <span class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.above20d', { ratio: formatRatio(summary.above20d.ratio) }) }}</span>
                  </div>
                  <div class="rounded-dt-md border border-dt-border bg-dt-bg p-3">
                    <strong class="block text-xl text-dt-text">{{ summary.above50d.count }} / {{ summary.above50d.total }}</strong>
                    <span class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.above50d', { ratio: formatRatio(summary.above50d.ratio) }) }}</span>
                  </div>
                  <div class="rounded-dt-md border border-dt-border bg-dt-bg p-3">
                    <strong class="block text-xl text-dt-text">{{ formatNumber(summary.averageRsi, 1) }}</strong>
                    <span class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.averageRsi') }}</span>
                  </div>
                  <div class="rounded-dt-md border border-dt-border bg-dt-bg p-3">
                    <strong class="block text-xl capitalize text-dt-text">{{ marketStateLabel(summary.marketState) }}</strong>
                    <span class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.marketState') }}</span>
                  </div>
                </div>
              </div>
            </div>

          <div v-if="loading && !payload" class="grid min-h-[420px] place-items-center p-6">
              <div class="text-center">
                <Icon name="heroicons:arrow-path" class="mx-auto h-9 w-9 animate-spin text-dt-primary" />
                <p class="mt-3 text-sm font-semibold text-dt-text-soft">{{ t('marketRotation.summary.loading') }}</p>
              </div>
            </div>

            <template v-else-if="payload">
              <!-- Desktop table -->
              <div class="hidden overflow-x-auto md:block">
                <table class="w-full min-w-[1200px] border-collapse text-sm">
                  <caption class="bg-dt-bg px-4 py-2 text-left text-lg font-black text-dt-text">
                    {{ t('marketRotation.summary.rankSorted') }}
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
                          {{ t('marketRotation.columns.trend2W') }}
                        </th>
                      </template>
                      <th scope="col" class="sticky top-0 z-10 border border-dt-border-strong bg-dt-surface-muted px-3 py-2 text-center text-xs font-black uppercase tracking-[0.04em]">
                        {{ t('marketRotation.columns.maStatus') }}
                      </th>
                      <th scope="col" class="sticky top-0 z-10 border border-dt-border-strong bg-dt-surface-muted px-3 py-2 text-center text-xs font-black uppercase tracking-[0.04em]">
                        {{ t('marketRotation.columns.signal') }}
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
                        {{ formatPointDelta(row.rsiDelta2W) }}
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-right font-mono font-black text-dt-text">
                        {{ row.rotationRank != null ? `#${row.rotationRank}` : '--' }}
                      </td>
                      <td class="border border-dt-border px-3 py-2 text-right font-mono font-bold" :class="deltaClass(row.rankDelta2W)">
                        {{ formatRankDelta(row.rankDelta2W) }}
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
                          :aria-label="t('marketRotation.summary.trendAria', { symbol: row.symbol })"
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
      class="fixed inset-0 z-40 bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      @click.self="selectedRow = null"
    >
      <aside class="ml-auto flex h-full w-full max-w-md flex-col overflow-hidden rounded-dt-lg border border-dt-border bg-dt-surface shadow-dt-lg">
        <div class="flex items-start justify-between gap-4 border-b border-dt-border p-5">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('marketRotation.summary.detail') }}</p>
            <h2 class="text-2xl font-black text-dt-text">{{ selectedRow.symbol }}</h2>
            <p class="text-sm text-dt-text-muted">{{ selectedRow.sectorName ?? selectedRow.name }}</p>
          </div>
          <div class="flex shrink-0 items-center gap-2">
            <BaseButton v-if="researchCapture.canCapture.value" variant="secondary" class="!min-h-10 !px-3 !py-2 text-xs" @click="openMarketRotationCapture(selectedRow)">
              {{ t('researchCapture.captureInsight') }}
            </BaseButton>
            <BaseButton
              variant="ghost"
              :aria-label="t('marketRotation.summary.closeDetail')"
              class="!h-10 !w-10 !min-w-0 !rounded-full !px-0"
              @click="selectedRow = null"
            >
              <Icon name="heroicons:x-mark" class="h-5 w-5" />
            </BaseButton>
          </div>
        </div>

        <div class="grid gap-3 overflow-y-auto p-5">
          <LedgerCard>
            <div class="flex items-center justify-between">
              <div>
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('marketRotation.summary.lastPrice') }}</p>
                <p class="mt-1 text-3xl font-black text-dt-text">{{ formatNumber(selectedRow.lastPrice) }}</p>
              </div>
              <div class="text-right">
                <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('marketRotation.summary.rotationRank') }}</p>
                <p class="mt-1 text-3xl font-black text-dt-text">{{ selectedRow.rotationRank != null ? `#${selectedRow.rotationRank}` : '--' }}</p>
              </div>
            </div>
          </LedgerCard>

          <LedgerCard>
            <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('marketRotation.summary.signal') }}</p>
            <div class="mt-2 flex items-center gap-2">
              <StatusBadge :tone="signalTone(selectedRow.signal)">
                {{ signalLabel(selectedRow.signal) }}
              </StatusBadge>
              <span class="text-xs text-dt-text-muted">{{ selectedRow.signalStatus === 'complete' ? t('marketRotation.common.completeData') : t('marketRotation.common.insufficientData') }}</span>
            </div>
          </LedgerCard>

          <div class="grid grid-cols-2 gap-3">
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.rsi14') }}</p>
              <p class="mt-1 text-xl font-black text-dt-text">{{ formatNumber(selectedRow.rsi14, 1) }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.rsiDelta2W') }}</p>
              <p class="mt-1 text-xl font-black" :class="deltaClass(selectedRow.rsiDelta2W)">{{ formatPointDelta(selectedRow.rsiDelta2W) }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">{{ t('marketRotation.columns.rankDelta2W') }}</p>
              <p class="mt-1 text-xl font-black" :class="deltaClass(selectedRow.rankDelta2W)">{{ formatRankDelta(selectedRow.rankDelta2W) }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.performance2W') }}</p>
              <p class="mt-1 text-xl font-black" :class="deltaClass(selectedRow.twoWeekPerformancePct)">{{ formatPercent(selectedRow.twoWeekPerformancePct) }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.fromHigh') }}</p>
              <p class="mt-1 text-xl font-black" :class="fromHighClass(selectedRow.percentFromHigh)">{{ formatPercent(selectedRow.percentFromHigh) }}</p>
            </LedgerCard>
            <LedgerCard>
              <p class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.rotationScore') }}</p>
              <p class="mt-1 text-xl font-black text-dt-text">{{ formatNumber(selectedRow.rotationScore, 1) }}</p>
            </LedgerCard>
          </div>

          <LedgerCard>
            <p class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-muted">{{ t('marketRotation.columns.maStatus') }}</p>
            <div class="mt-2 flex flex-wrap items-center gap-2">
              <StatusBadge :tone="maStatusTone(selectedRow.maStatus)">
                {{ maStatusLabel(selectedRow.maStatus) }}
              </StatusBadge>
              <span class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.above20dValue', { value: selectedRow.above20d === true ? t('marketRotation.common.yes') : selectedRow.above20d === false ? t('marketRotation.common.no') : t('marketRotation.common.na') }) }}</span>
              <span class="text-xs text-dt-text-muted">{{ t('marketRotation.summary.above50dValue', { value: selectedRow.above50d === true ? t('marketRotation.common.yes') : selectedRow.above50d === false ? t('marketRotation.common.no') : t('marketRotation.common.na') }) }}</span>
            </div>
          </LedgerCard>
        </div>
      </aside>
    </div>

    <ResearchCaptureModal :capture="researchCapture" />
  </div>
</template>
