<script setup lang="ts">
import { calculatePositionSizing, validateRatios } from '~/lib/positionSizing'
import { formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil } from '~/lib/format'
import type { RoundingMode, PositionResult, CalculationSummary } from '~/lib/positionSizing'
import type { VueMessageType } from 'vue-i18n'

const { t, rt, tm } = useI18n()
const toast = useToast()

interface Strategy {
  id: string
  name: string
  ratios: number[]
  description: string
  pros: string[]
  cons: string[]
}

const strategyConfigs = [
  { id: 'pyramid', i18nKey: 'pyramid', ratios: [40, 30, 20, 10] },
  { id: 'pyramid-variant', i18nKey: 'pyramidVariant', ratios: [20, 20, 30, 20, 10] },
  { id: 'rectangular', i18nKey: 'rectangular', ratios: [30, 30, 30, 10] },
  { id: 'inverted-pyramid', i18nKey: 'invertedPyramid', ratios: [10, 20, 30, 40] }
]

const strategies = computed<Strategy[]>(() =>
  strategyConfigs.map(config => ({
    id: config.id,
    name: t(`tools.positionSizing.strategies.${config.i18nKey}.name`),
    ratios: config.ratios,
    description: t(`tools.positionSizing.strategies.${config.i18nKey}.description`),
    pros: (tm(`tools.positionSizing.strategies.${config.i18nKey}.pros`) as VueMessageType[]).map(item => rt(item)),
    cons: (tm(`tools.positionSizing.strategies.${config.i18nKey}.cons`) as VueMessageType[]).map(item => rt(item))
  }))
)

const stockName = ref<string>('')

watch(stockName, (newValue) => {
  if (newValue && newValue !== newValue.toUpperCase()) {
    stockName.value = newValue.toUpperCase()
  }
})

const baseCapital = ref<number | null>(null)
const capitalPercent = ref<number | null>(null)
const totalCapital = ref<number | null>(null)
const usePercentageMode = ref<boolean>(false)
const stockPrice = ref<number | null>(null)
const selectedStrategyId = ref<string>('pyramid')
const reserveCashPercent = ref<number>(0)
const roundingMode = ref<RoundingMode>('down')

const effectiveCapital = computed(() => {
  if (usePercentageMode.value) {
    if (baseCapital.value !== null && capitalPercent.value !== null) {
      return (baseCapital.value * capitalPercent.value) / 100
    }
    return null
  }
  return totalCapital.value
})

const selectedStrategy = computed(() => {
  const found = strategies.value.find(s => s.id === selectedStrategyId.value)
  return found ?? strategies.value[0]!
})

const isValidInput = computed(() =>
  effectiveCapital.value !== null &&
  effectiveCapital.value > 0 &&
  stockPrice.value !== null &&
  stockPrice.value > 0
)

const ratiosValidation = computed(() => validateRatios(selectedStrategy.value.ratios))

const calculationOutput = computed(() => {
  if (!isValidInput.value || !effectiveCapital.value || !stockPrice.value) {
    return { results: [], summary: null, warnings: [] }
  }

  return calculatePositionSizing({
    capital: effectiveCapital.value,
    stockPrice: stockPrice.value,
    ratios: selectedStrategy.value.ratios,
    reserveCashPercent: reserveCashPercent.value,
    roundingMode: roundingMode.value
  })
})

const calculationResults = computed<PositionResult[]>(() => calculationOutput.value.results)
const summary = computed<CalculationSummary | null>(() => calculationOutput.value.summary)
const warnings = computed<string[]>(() => calculationOutput.value.warnings)

const formatCurrency = (value: number) => formatCurrencyUtil(value, { decimals: 0 })
const formatNumber = formatNumberUtil

const copySuccess = ref(false)

const generateMarkdown = () => {
  if (!calculationResults.value.length || !summary.value || !effectiveCapital.value || !stockPrice.value) return ''

  const lines: string[] = []
  const title = stockName.value
    ? `${t('tools.positionSizing.markdown.title')} ${stockName.value}`
    : t('tools.positionSizing.markdown.title')
  lines.push(`# ${title}`)
  lines.push('')
  lines.push(`**${t('tools.positionSizing.markdown.strategy')}**: ${selectedStrategy.value.name}`)
  lines.push(`**${t('tools.positionSizing.markdown.totalCapital')}**: ${formatCurrency(effectiveCapital.value)} ($)`)
  lines.push(`**${t('tools.positionSizing.markdown.stockPrice')}**: ${stockPrice.value} $`)
  lines.push(`**${t('tools.positionSizing.markdown.reserveCash')}**: ${reserveCashPercent.value}%`)
  lines.push('')
  lines.push(`## ${t('tools.positionSizing.markdown.summary')}`)
  lines.push('')
  lines.push(`| ${t('tools.positionSizing.markdown.item')} | ${t('tools.positionSizing.markdown.value')} |`)
  lines.push(`|------|------|`)
  lines.push(`| ${t('tools.positionSizing.markdown.totalShares')} | ${formatNumber(summary.value.totalShares)} ${t('tools.positionSizing.markdown.sharesUnit')} |`)
  lines.push(`| ${t('tools.positionSizing.markdown.totalInvested')} | ${formatCurrency(summary.value.totalInvested)} $ |`)
  lines.push(`| ${t('tools.positionSizing.markdown.avgPrice')} | ${summary.value.avgPrice.toFixed(2)} $/${t('tools.positionSizing.markdown.perShare')}（${t('tools.positionSizing.markdown.samePriceAssumption')}）|`)
  lines.push(`| ${t('tools.positionSizing.markdown.utilizationRate')} | ${summary.value.utilizationRate.toFixed(1)}% |`)
  if (summary.value.reservedCash > 0 || summary.value.unallocatedCash > 0) {
    lines.push(`| ${t('tools.positionSizing.markdown.strategicReserve')} | ${formatCurrency(summary.value.reservedCash)} $ |`)
    lines.push(`| ${t('tools.positionSizing.markdown.technicalRemainder')} | ${formatCurrency(summary.value.unallocatedCash)} $ |`)
    lines.push(`| ${t('tools.positionSizing.markdown.totalRemainingCash')} | ${formatCurrency(summary.value.totalRemainingCash)} $ |`)
  }
  if (summary.value.isOverBudget) {
    lines.push(`| ⚠️ ${t('tools.positionSizing.markdown.overBudget')} | ${formatCurrency(summary.value.overBudgetAmount)} $（${t('tools.positionSizing.markdown.adjusted')}）|`)
  }
  lines.push('')
  lines.push(`## ${t('tools.positionSizing.markdown.batchDetails')}`)
  lines.push('')
  lines.push(`| ${t('tools.positionSizing.markdown.batch')} | ${t('tools.positionSizing.markdown.ratio')} | ${t('tools.positionSizing.markdown.plannedAmount')} | ${t('tools.positionSizing.markdown.shares')} | ${t('tools.positionSizing.markdown.actualAmount')} | ${t('tools.positionSizing.markdown.cumulativeShares')} |`)
  lines.push(`|------|------|----------|------|----------|----------|`)

  for (const [i, result] of calculationResults.value.entries()) {
    const r = result!
    lines.push(`| ${t('tools.positionSizing.markdown.batchN', { n: i + 1 })} | ${r.ratio}% | ${formatCurrency(r.amount)} | ${formatNumber(r.shares)} | ${formatCurrency(r.actualAmount)} | ${formatNumber(r.cumulativeShares)} |`)
  }

  lines.push('')
  lines.push(`## ${t('tools.positionSizing.markdown.strategyDescription')}`)
  lines.push('')
  lines.push(`### ${t('tools.positionSizing.markdown.pros')}`)
  for (const pro of selectedStrategy.value.pros) {
    lines.push(`- ${pro}`)
  }
  lines.push('')
  lines.push(`### ${t('tools.positionSizing.markdown.cons')}`)
  for (const con of selectedStrategy.value.cons) {
    lines.push(`- ${con}`)
  }
  lines.push('')
  lines.push(`> ${selectedStrategy.value.description}`)
  lines.push('')
  lines.push('---')
  lines.push(`*${t('tools.positionSizing.markdown.generatedBy')}*`)

  return lines.join('\n')
}

const copyToClipboard = async () => {
  const markdown = generateMarkdown()
  if (!markdown) return

  try {
    await navigator.clipboard.writeText(markdown)
    copySuccess.value = true
    toast.success(t('tools.positionSizing.copySuccess'))
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {
    toast.error(t('tools.positionSizing.copyFailed'))
  }
}

useHead({
  title: '建倉比例計算器 - 投資工具',
  meta: [
    { name: 'description', content: '免費線上建倉比例計算器，支援正金字塔(4-3-2-1)、矩形(3-3-3-1)、倒金字塔(1-2-3-4)等多種建倉策略，幫助您合理分配資金。' }
  ]
})

definePageMeta({
  requiresAuth: false
})
</script>

<template>
  <div class="position-page min-h-screen">
    <section class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="panel overflow-hidden p-6 sm:p-8">
        <div class="grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
          <div>
            <p class="kicker mb-3">{{ t('tools.positionSizing.heroKicker') }}</p>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              {{ t('tools.positionSizing.title') }}
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {{ t('tools.positionSizing.subtitle') }}
            </p>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="metric-card">
                <div class="metric-label">{{ t('tools.positionSizing.strategy') }}</div>
                <div class="metric-value">{{ selectedStrategy.name }}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">{{ t('tools.positionSizing.investCapital') }}</div>
                <div class="metric-value">{{ effectiveCapital ? formatCurrency(effectiveCapital) : '—' }}</div>
              </div>
              <div class="metric-card">
                <div class="metric-label">{{ t('tools.positionSizing.stockPrice') }}</div>
                <div class="metric-value">{{ stockPrice ? `$${stockPrice}` : '—' }}</div>
              </div>
            </div>
          </div>

          <div class="hero-spotlight">
            <div class="hero-spotlight-label">{{ t('tools.positionSizing.capitalInputMode') }}</div>
            <div class="hero-spotlight-value">
              {{ usePercentageMode ? t('tools.positionSizing.switchToDirect') : t('tools.positionSizing.switchToPercentage') }}
            </div>
            <p class="text-sm leading-6 text-slate-300">
              {{ selectedStrategy.description }}
            </p>

            <div class="mt-6 space-y-3">
              <div class="spotlight-stat">
                <span class="spotlight-stat-label">{{ t('tools.positionSizing.reserveCash') }}</span>
                <span class="spotlight-stat-value">{{ reserveCashPercent }}%</span>
              </div>
              <div class="spotlight-stat">
                <span class="spotlight-stat-label">{{ t('tools.positionSizing.roundingMode') }}</span>
                <span class="spotlight-stat-value">{{ t(`tools.positionSizing.${roundingMode === 'down' ? 'roundDown' : roundingMode === 'nearest' ? 'roundNearest' : 'roundUp'}`) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <div class="space-y-6">
        <div class="panel p-6 sm:p-7">
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="kicker mb-2">{{ t('tools.positionSizing.inputParams') }}</p>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {{ t('tools.positionSizing.inputParams') }}
              </h2>
            </div>
            <button type="button" class="action-btn-muted w-full cursor-pointer sm:w-auto" @click="usePercentageMode = !usePercentageMode">
              {{ usePercentageMode ? t('tools.positionSizing.switchToDirect') : t('tools.positionSizing.switchToPercentage') }}
            </button>
          </div>

          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label class="field-label">
                {{ t('tools.positionSizing.stockName') }}
                <span class="text-slate-400">({{ t('common.optional') }})</span>
              </label>
              <div class="field-shell">
                <input v-model="stockName" type="text" :placeholder="t('tools.positionSizing.stockNamePlaceholder')" class="field-input">
              </div>
            </div>

            <div>
              <label class="field-label">{{ t('tools.positionSizing.stockPrice') }}</label>
              <div class="field-shell">
                <input v-model.number="stockPrice" type="number" min="0" step="0.5" :placeholder="t('tools.positionSizing.stockPricePlaceholder')" class="field-input">
                <span class="field-unit">$</span>
              </div>
            </div>
          </div>

          <div class="subpanel mt-6">
            <div v-if="usePercentageMode" class="grid gap-5 md:grid-cols-2">
              <div>
                <label class="field-label">{{ t('tools.positionSizing.baseCapital') }}</label>
                <div class="field-shell">
                  <input v-model.number="baseCapital" type="number" min="0" step="10000" :placeholder="t('tools.positionSizing.baseCapitalPlaceholder')" class="field-input">
                  <span class="field-unit">$</span>
                </div>
              </div>

              <div>
                <label class="field-label">{{ t('tools.positionSizing.capitalPercent') }}</label>
                <div class="field-shell">
                  <input v-model.number="capitalPercent" type="number" min="0" max="100" step="1" :placeholder="t('tools.positionSizing.capitalPercentPlaceholder')" class="field-input">
                  <span class="field-unit">%</span>
                </div>
              </div>
            </div>

            <div v-else>
              <label class="field-label">{{ t('tools.positionSizing.investCapital') }}</label>
              <div class="field-shell">
                <input v-model.number="totalCapital" type="number" min="0" step="10000" :placeholder="t('tools.positionSizing.totalCapitalPlaceholder')" class="field-input">
                <span class="field-unit">$</span>
              </div>
            </div>

            <div v-if="usePercentageMode && effectiveCapital" class="result-chip mt-5">
              <span class="result-chip-label">{{ t('tools.positionSizing.calculatedCapital') }}</span>
              <span class="result-chip-value">{{ formatCurrency(effectiveCapital) }}</span>
            </div>
          </div>

          <div class="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label class="field-label">{{ t('tools.positionSizing.reserveCash') }}</label>
              <div class="subpanel mt-2">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <input v-model.number="reserveCashPercent" type="range" min="0" max="20" step="1" class="w-full cursor-pointer" style="accent-color: var(--color-secondary)">
                  <span class="text-sm font-semibold text-slate-900 dark:text-slate-100 sm:min-w-12 sm:text-right">{{ reserveCashPercent }}%</span>
                </div>
                <p class="field-hint">{{ t('tools.positionSizing.reserveCashHint') }}</p>
              </div>
            </div>

            <div>
              <label class="field-label">{{ t('tools.positionSizing.roundingMode') }}</label>
              <div class="mt-2 grid gap-2 sm:grid-cols-2">
                <button type="button" class="choice-card cursor-pointer text-center leading-snug break-words" :class="roundingMode === 'down' ? 'choice-card-active' : ''" @click="roundingMode = 'down'">
                  {{ t('tools.positionSizing.roundDown') }}
                </button>
                <button type="button" class="choice-card cursor-pointer text-center leading-snug break-words" :class="roundingMode === 'nearest' ? 'choice-card-active' : ''" @click="roundingMode = 'nearest'">
                  {{ t('tools.positionSizing.roundNearest') }}
                </button>
                <button type="button" class="choice-card cursor-pointer text-center leading-snug break-words" :class="roundingMode === 'up' ? 'choice-card-active' : ''" @click="roundingMode = 'up'">
                  {{ t('tools.positionSizing.roundUp') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isValidInput && summary" class="panel overflow-hidden">
          <div class="result-banner p-6 sm:p-7">
            <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-sky-100/80">
                  {{ t('tools.positionSizing.totalInvested') }}
                </p>
                <div class="mt-2 text-4xl font-semibold tracking-tight text-white">
                  {{ formatCurrency(summary.totalInvested) }}
                </div>
              </div>
              <button type="button" class="action-btn w-full cursor-pointer sm:w-auto" @click="copyToClipboard">
                <Icon :name="copySuccess ? 'heroicons:check' : 'heroicons:clipboard-document'" class="mr-2 h-4 w-4" />
                {{ copySuccess ? t('tools.positionSizing.copied') : t('tools.positionSizing.copyToClipboard') }}
              </button>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="spotlight-stat">
                <span class="spotlight-stat-label">{{ t('tools.positionSizing.totalShares') }}</span>
                <span class="spotlight-stat-value">{{ formatNumber(summary.totalShares) }}</span>
              </div>
              <div class="spotlight-stat">
                <span class="spotlight-stat-label">{{ t('tools.positionSizing.avgPrice') }}</span>
                <span class="spotlight-stat-value">{{ summary.avgPrice.toFixed(2) }}</span>
              </div>
              <div class="spotlight-stat">
                <span class="spotlight-stat-label">{{ t('tools.positionSizing.utilizationRate') }}</span>
                <span class="spotlight-stat-value">{{ summary.utilizationRate.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="panel p-6 sm:p-7">
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="kicker mb-2">{{ t('tools.positionSizing.strategy') }}</p>
              <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {{ t('tools.positionSizing.strategy') }}
              </h3>
            </div>
            <span v-if="!ratiosValidation.isValid" class="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-300">
              {{ ratiosValidation.sum.toFixed(1) }}%
            </span>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <button
              v-for="strategy in strategies"
              :key="strategy.id"
              type="button"
              class="choice-card cursor-pointer text-left"
              :class="selectedStrategyId === strategy.id ? 'choice-card-active' : ''"
              @click="selectedStrategyId = strategy.id"
            >
              <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ strategy.name }}</div>
              <div class="mt-2 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                {{ strategy.ratios.join(' / ') }}
              </div>
            </button>
          </div>

          <div class="subpanel mt-5">
            <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ selectedStrategy.name }}</div>
            <p class="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {{ selectedStrategy.description }}
            </p>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <div class="field-label">{{ t('tools.positionSizing.markdown.pros') }}</div>
                <ul class="mt-3 space-y-2">
                  <li v-for="pro in selectedStrategy.pros" :key="pro" class="list-row">
                    <Icon name="heroicons:check-circle" class="h-4 w-4 text-emerald-500" />
                    <span>{{ pro }}</span>
                  </li>
                </ul>
              </div>
              <div>
                <div class="field-label">{{ t('tools.positionSizing.markdown.cons') }}</div>
                <ul class="mt-3 space-y-2">
                  <li v-for="con in selectedStrategy.cons" :key="con" class="list-row">
                    <Icon name="heroicons:minus-circle" class="h-4 w-4 text-amber-500" />
                    <span>{{ con }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div v-if="summary && (summary.reservedCash > 0 || summary.unallocatedCash > 0)" class="panel p-6 sm:p-7">
          <p class="kicker mb-2">{{ t('tools.positionSizing.cashBufferTitle') }}</p>
          <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">{{ t('tools.positionSizing.cashBufferTitle') }}</h3>
          <div class="mt-5 grid gap-3">
            <div v-if="summary.reservedCash > 0" class="summary-card">
              <div class="summary-label">{{ t('tools.positionSizing.markdown.strategicReserve') }}</div>
              <div class="summary-value">{{ formatCurrency(summary.reservedCash) }}</div>
            </div>
            <div v-if="summary.unallocatedCash > 0" class="summary-card">
              <div class="summary-label">{{ t('tools.positionSizing.markdown.technicalRemainder') }}</div>
              <div class="summary-value">{{ formatCurrency(summary.unallocatedCash) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">{{ t('tools.positionSizing.markdown.totalRemainingCash') }}</div>
              <div class="summary-value">{{ formatCurrency(summary.totalRemainingCash) }}</div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="isValidInput && calculationResults.length" class="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div class="panel p-6 sm:p-7">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="kicker mb-2">{{ t('tools.positionSizing.detailTable') }}</p>
            <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
              {{ t('tools.positionSizing.detailTable') }}
            </h3>
          </div>
          <div class="text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            {{ calculationResults.length }} {{ t('tools.positionSizing.batches') }}
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div v-for="(result, index) in calculationResults" :key="index" class="batch-card">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {{ t('tools.positionSizing.table.batchN', { n: index + 1 }) }}
                </div>
                <div class="mt-1 text-xs uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">
                  {{ result.ratio }}%
                </div>
              </div>
              <div class="rounded-full px-3 py-1 text-sm font-semibold" style="background: color-mix(in srgb, var(--color-secondary) 15%, var(--color-surface)); color: var(--color-secondary)">
                {{ formatNumber(result.shares) }} {{ t('tools.positionSizing.shares') || '股' }}
              </div>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="projection-stat">
                <span class="projection-label">{{ t('tools.positionSizing.table.plannedAmount') }}</span>
                <span class="projection-value">{{ formatCurrency(result.amount) }}</span>
              </div>
              <div class="projection-stat">
                <span class="projection-label">{{ t('tools.positionSizing.table.actualAmount') }}</span>
                <span class="projection-value">{{ formatCurrency(result.actualAmount) }}</span>
              </div>
              <div class="projection-stat">
                <span class="projection-label">{{ t('tools.positionSizing.table.cumulativeShares') }}</span>
                <span class="projection-value">{{ formatNumber(result.cumulativeShares) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="warnings.length > 0 || (summary && summary.isOverBudget)" class="mt-6 space-y-3">
          <div v-for="(warning, index) in warnings" :key="index" class="warning-card">
            <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 text-amber-500" />
            <span class="text-sm text-amber-900 dark:text-amber-200">{{ warning }}</span>
          </div>
          <div v-if="summary && summary.isOverBudget" class="warning-card warning-card-danger">
            <Icon name="heroicons:exclamation-circle" class="h-5 w-5 text-rose-500" />
            <span class="text-sm text-rose-900 dark:text-rose-200">
              {{ t('tools.positionSizing.overBudgetWarning', { amount: formatCurrency(summary.overBudgetAmount) }) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div class="panel p-10 text-center">
        <Icon name="heroicons:calculator" class="mx-auto h-14 w-14 text-slate-300 dark:text-slate-300" />
        <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
          {{ t('tools.positionSizing.emptyState') }}
        </p>
      </div>
    </section>
  </div>
</template>

<style scoped>
.position-page {
  font-family: var(--font-body);
  background: var(--color-background);
}

.panel {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface);
  box-shadow: var(--shadow-sm);
}

.kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: var(--color-secondary);
  font-weight: 700;
}

.metric-card,
.summary-card,
.projection-stat,
.batch-card {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  padding: 1rem;
}

.metric-label,
.summary-label,
.projection-label,
.spotlight-stat-label,
.field-label {
  display: block;
  min-width: 0;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  line-height: 1.35;
  overflow-wrap: anywhere;
  word-break: break-word;
  color: var(--color-text-soft);
}

.metric-value,
.summary-value,
.projection-value,
.spotlight-stat-value {
  margin-top: 0.5rem;
  display: block;
  min-width: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.2;
  font-size: 1.35rem;
  font-weight: 600;
  font-family: var(--font-data);
  color: var(--color-text);
}

.hero-spotlight {
  border: 1px solid color-mix(in srgb, var(--color-primary) 30%, transparent);
  border-radius: var(--radius-md);
  padding: 1.5rem;
  background: linear-gradient(160deg, var(--color-panel-ink), color-mix(in srgb, var(--color-panel-ink) 94%, transparent) 48%, color-mix(in srgb, var(--color-panel-ink) 80%, var(--color-surface-strong)));
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 6%);
}

.hero-spotlight-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(255 255 255 / 60%);
}

.hero-spotlight-value {
  margin-top: 0.5rem;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.15;
  font-size: 1.85rem;
  font-weight: 600;
  font-family: var(--font-data);
  color: white;
}

.spotlight-stat {
  min-width: 0;
  border: 1px solid rgb(255 255 255 / 10%);
  border-radius: var(--radius-sm);
  padding: 0.9rem 1rem;
  background: rgb(255 255 255 / 4%);
}

.subpanel,
.result-chip {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  padding: 1rem;
}

.result-chip {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
}

.result-chip-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: var(--color-secondary);
}

.result-chip-value {
  font-size: 1.1rem;
  font-weight: 600;
  font-family: var(--font-data);
  color: var(--color-text);
}

.field-shell {
  position: relative;
  margin-top: 0.55rem;
}

.field-input {
  width: 100%;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  padding: 0.9rem 3.5rem 0.9rem 1rem;
  color: var(--color-text);
  transition: border-color 180ms ease, box-shadow 180ms ease;
}

.field-input:focus {
  outline: none;
  border-color: var(--color-secondary);
  box-shadow: 0 0 0 4px color-mix(in srgb, var(--color-secondary) 15%, transparent);
}

.field-unit {
  position: absolute;
  right: 0.95rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8rem;
  font-weight: 600;
  font-family: var(--font-data);
  color: var(--color-text-soft);
}

.field-hint {
  margin-top: 0.45rem;
  font-size: 0.8rem;
  color: var(--color-text-soft);
}

.choice-card {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  padding: 1rem;
  line-height: 1.35;
  overflow-wrap: anywhere;
  word-break: break-word;
  transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.choice-card:hover {
  transform: translateY(-1px);
}

.choice-card-active {
  border-color: var(--color-secondary);
  background: color-mix(in srgb, var(--color-secondary) 8%, var(--color-surface));
}

.result-banner {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-info) 35%, transparent), transparent 28%),
    linear-gradient(145deg, var(--color-panel-ink), color-mix(in srgb, var(--color-panel-ink) 80%, var(--color-surface-strong)));
}

.action-btn,
.action-btn-muted {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  padding: 0.7rem 1.2rem;
  transition: background-color var(--motion-fast) var(--easing-standard), border-color 180ms ease, transform var(--motion-fast) var(--easing-standard);
}

.action-btn {
  color: white;
  background: var(--color-primary);
}

.action-btn:hover {
  background: var(--color-primary-active);
  transform: translateY(-1px);
}

.action-btn-muted {
  border: 1px solid var(--color-border);
  background: var(--color-surface-muted);
  color: var(--color-primary);
}

.action-btn-muted:hover {
  background: var(--color-surface-strong);
}

.list-row,
.warning-card {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
}

.warning-card {
  border: 1px solid color-mix(in srgb, var(--color-warning) 40%, var(--color-border));
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface));
  padding: 0.95rem 1rem;
}

.warning-card-danger {
  border-color: color-mix(in srgb, var(--color-danger) 40%, var(--color-border));
  background: color-mix(in srgb, var(--color-danger) 8%, var(--color-surface));
}

/* Typography & color overrides for Tailwind hardcoded classes */
.position-page h1 {
  font-family: var(--font-display);
  color: var(--color-text);
}

.position-page h2,
.position-page h3 {
  color: var(--color-text);
}

@media (max-width: 639px) {
  .result-chip {
    flex-direction: column;
    align-items: flex-start;
  }
}

</style>
