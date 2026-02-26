<script setup lang="ts">
import { calculatePositionSizing, validateRatios, formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil } from '~/lib/positionSizing'
import type { RoundingMode, PositionResult, CalculationSummary } from '~/lib/positionSizing'
import type { VueMessageType } from 'vue-i18n'

const { t, rt, tm } = useI18n()

// Define position sizing strategies
interface Strategy {
  id: string
  name: string
  ratios: number[]
  description: string
  pros: string[]
  cons: string[]
}

// Strategy configurations with i18n keys
const strategyConfigs = [
  {
    id: 'pyramid',
    i18nKey: 'pyramid',
    ratios: [40, 30, 20, 10]
  },
  {
    id: 'pyramid-variant',
    i18nKey: 'pyramidVariant',
    ratios: [20, 20, 30, 20, 10]
  },
  {
    id: 'rectangular',
    i18nKey: 'rectangular',
    ratios: [30, 30, 30, 10]
  },
  {
    id: 'inverted-pyramid',
    i18nKey: 'invertedPyramid',
    ratios: [10, 20, 30, 40]
  }
]

// Computed strategies with i18n translations
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

// Form state
const stockName = ref<string>('') // Optional stock name - will be auto-uppercased

// Watch stockName and convert to uppercase
watch(stockName, (newValue) => {
  if (newValue && newValue !== newValue.toUpperCase()) {
    stockName.value = newValue.toUpperCase()
  }
})
const baseCapital = ref<number | null>(null) // Base capital for percentage calculation
const capitalPercent = ref<number | null>(null) // Percentage of base capital to use
const totalCapital = ref<number | null>(null) // Direct capital input
const usePercentageMode = ref<boolean>(false) // Default: direct input mode, can switch to percentage mode
const stockPrice = ref<number | null>(null)
const selectedStrategyId = ref<string>('pyramid')
const reserveCashPercent = ref<number>(0) // Extra cash to reserve (0-20%)
const roundingMode = ref<RoundingMode>('down') // Share rounding

// Computed effective capital
const effectiveCapital = computed(() => {
  if (usePercentageMode.value) {
    if (baseCapital.value !== null && capitalPercent.value !== null) {
      return (baseCapital.value * capitalPercent.value) / 100
    }
    return null
  }
  return totalCapital.value
})

// Computed
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

// 策略比例驗證
const ratiosValidation = computed(() => validateRatios(selectedStrategy.value.ratios))

// 使用純計算函式
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

// Format helpers - 使用 lib 匯出的函式
const formatCurrency = formatCurrencyUtil
const formatNumber = formatNumberUtil

const formatPercent = (value: number) => {
  return `${value.toFixed(1)}%`
}

// Copy to clipboard
const copySuccess = ref(false)
const toast = useToast()

const generateMarkdown = () => {
  if (!calculationResults.value.length || !summary.value || !effectiveCapital.value || !stockPrice.value) return ''

  const lines: string[] = []
  
  // Header
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
  
  // Summary
  lines.push(`## ${t('tools.positionSizing.markdown.summary')}`)
  lines.push('')
  lines.push(`| ${t('tools.positionSizing.markdown.item')} | ${t('tools.positionSizing.markdown.value')} |`)
  lines.push(`|------|------|`)
  lines.push(`| ${t('tools.positionSizing.markdown.totalShares')} | ${formatNumber(summary.value.totalShares)} ${t('tools.positionSizing.markdown.sharesUnit')} |`)
  lines.push(`| ${t('tools.positionSizing.markdown.totalInvested')} | ${formatCurrency(summary.value.totalInvested)} $ |`)
  lines.push(`| ${t('tools.positionSizing.markdown.avgPrice')} | ${summary.value.avgPrice.toFixed(2)} $/${t('tools.positionSizing.markdown.perShare')}（${t('tools.positionSizing.markdown.samePriceAssumption')}）|`)
  lines.push(`| ${t('tools.positionSizing.markdown.utilizationRate')} | ${summary.value.utilizationRate.toFixed(1)}% |`)
  // 現金明細
  if (summary.value.reservedCash > 0 || summary.value.unallocatedCash > 0) {
    lines.push(`| ${t('tools.positionSizing.markdown.strategicReserve')} | ${formatCurrency(summary.value.reservedCash)} $ |`)
    lines.push(`| ${t('tools.positionSizing.markdown.technicalRemainder')} | ${formatCurrency(summary.value.unallocatedCash)} $ |`)
    lines.push(`| ${t('tools.positionSizing.markdown.totalRemainingCash')} | ${formatCurrency(summary.value.totalRemainingCash)} $ |`)
  }
  // 超額警告
  if (summary.value.isOverBudget) {
    lines.push(`| ⚠️ ${t('tools.positionSizing.markdown.overBudget')} | ${formatCurrency(summary.value.overBudgetAmount)} $（${t('tools.positionSizing.markdown.adjusted')}）|`)
  }
  lines.push('')
  
  // Detail table
  lines.push(`## ${t('tools.positionSizing.markdown.batchDetails')}`)
  lines.push('')
  lines.push(`| ${t('tools.positionSizing.markdown.batch')} | ${t('tools.positionSizing.markdown.ratio')} | ${t('tools.positionSizing.markdown.plannedAmount')} | ${t('tools.positionSizing.markdown.shares')} | ${t('tools.positionSizing.markdown.actualAmount')} | ${t('tools.positionSizing.markdown.cumulativeShares')} |`)
  lines.push(`|------|------|----------|------|----------|----------|`)
  
  for (const [i, result] of calculationResults.value.entries()) {
    const r = result!
    lines.push(`| ${t('tools.positionSizing.markdown.batchN', { n: i + 1 })} | ${r.ratio}% | ${formatCurrency(r.amount)} | ${formatNumber(r.shares)} | ${formatCurrency(r.actualAmount)} | ${formatNumber(r.cumulativeShares)} |`)
  }
  lines.push('')
  
  // Pros & Cons
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
  lines.push(`---`)
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
  } catch (err) {
    toast.error(t('tools.positionSizing.copyFailed'))
  }
}

// SEO
useHead({
  title: '建倉比例計算器 - 投資工具',
  meta: [
    { name: 'description', content: '免費線上建倉比例計算器，支援正金字塔(4-3-2-1)、矩形(3-3-3-1)、倒金字塔(1-2-3-4)等多種建倉策略，幫助您合理分配資金。' }
  ]
})

// Set page meta for public access
definePageMeta({
  requiresAuth: false
})
</script>

<template>
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-8">
      <h1 class="text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {{ t('tools.positionSizing.title') }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        {{ t('tools.positionSizing.subtitle') }}
      </p>
    </div>

    <!-- Input Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {{ t('tools.positionSizing.inputParams') }}
      </h2>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Stock Name (Optional) -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ t('tools.positionSizing.stockName') }}
            <span class="text-gray-400 text-xs">({{ t('common.optional') }})</span>
          </label>
          <input
            v-model="stockName"
            type="text"
            :placeholder="t('tools.positionSizing.stockNamePlaceholder')"
            class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
          />
        </div>

        <!-- Stock Price -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ t('tools.positionSizing.stockPrice') }}
          </label>
          <div class="relative">
            <input
              v-model.number="stockPrice"
              type="number"
              min="0"
              step="0.5"
              :placeholder="t('tools.positionSizing.stockPricePlaceholder')"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <span class="absolute right-3 top-2 text-gray-500 dark:text-gray-400">$</span>
          </div>
        </div>
      </div>

      <!-- Capital Input Section -->
      <div class="mt-6 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <div class="flex items-center justify-between mb-4">
          <span class="text-sm font-medium text-gray-700 dark:text-gray-300">
            {{ t('tools.positionSizing.capitalInputMode') }}
          </span>
          <button
            @click="usePercentageMode = !usePercentageMode"
            class="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300"
          >
            {{ usePercentageMode ? t('tools.positionSizing.switchToDirect') : t('tools.positionSizing.switchToPercentage') }}
          </button>
        </div>

        <!-- Percentage Mode -->
        <div v-if="usePercentageMode" class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Base Capital -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ t('tools.positionSizing.baseCapital') }}
            </label>
            <div class="relative">
              <input
                v-model.number="baseCapital"
                type="number"
                min="0"
                step="10000"
                :placeholder="t('tools.positionSizing.baseCapitalPlaceholder')"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
              <span class="absolute right-3 top-2 text-gray-500 dark:text-gray-400">$</span>
            </div>
          </div>

          <!-- Capital Percentage -->
          <div>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              {{ t('tools.positionSizing.capitalPercent') }}
            </label>
            <div class="relative">
              <input
                v-model.number="capitalPercent"
                type="number"
                min="0"
                max="100"
                step="1"
                :placeholder="t('tools.positionSizing.capitalPercentPlaceholder')"
                class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
              />
              <span class="absolute right-3 top-2 text-gray-500 dark:text-gray-400">%</span>
            </div>
          </div>
        </div>

        <!-- Direct Input Mode -->
        <div v-else>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ t('tools.positionSizing.investCapital') }}
          </label>
          <div class="relative">
            <input
              v-model.number="totalCapital"
              type="number"
              min="0"
              step="10000"
              :placeholder="t('tools.positionSizing.totalCapitalPlaceholder')"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <span class="absolute right-3 top-2 text-gray-500 dark:text-gray-400">$</span>
          </div>
        </div>

        <!-- Calculated Capital Display (for percentage mode) -->
        <div v-if="usePercentageMode && effectiveCapital" class="mt-4 p-3 bg-indigo-50 dark:bg-indigo-900/30 rounded-lg">
          <div class="flex items-center justify-between">
            <span class="text-sm text-indigo-700 dark:text-indigo-300">
              {{ t('tools.positionSizing.calculatedCapital') }}
            </span>
            <span class="text-lg font-semibold text-indigo-900 dark:text-indigo-100">
              {{ formatCurrency(effectiveCapital) }}
            </span>
          </div>
        </div>
      </div>

      <!-- Strategy Selection -->
      <div class="mt-6">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('tools.positionSizing.strategy') }}
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            v-for="strategy in strategies"
            :key="strategy.id"
            @click="selectedStrategyId = strategy.id"
            class="px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all"
            :class="selectedStrategyId === strategy.id
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'"
          >
            {{ strategy.name }}
          </button>
        </div>
        <!-- Ratio Sum Warning -->
        <div v-if="!ratiosValidation.isValid" class="mt-2 text-sm text-amber-600 dark:text-amber-400">
          ⚠️ 比例總和為 {{ ratiosValidation.sum.toFixed(1) }}%（非 100%）
        </div>
      </div>

      <!-- Advanced Options -->
      <div class="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
        <details class="group">
          <summary class="cursor-pointer text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white">
            {{ t('tools.positionSizing.advancedOptions') }}
            <Icon name="heroicons:chevron-down" class="inline w-4 h-4 ml-1 transition-transform group-open:rotate-180" />
          </summary>
          
          <div class="mt-4 grid grid-cols-1 md:grid-cols-2 gap-6">
            <!-- Reserve Cash -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('tools.positionSizing.reserveCash') }}
              </label>
              <div class="flex items-center gap-4">
                <input
                  v-model.number="reserveCashPercent"
                  type="range"
                  min="0"
                  max="20"
                  step="1"
                  class="flex-1 h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer"
                />
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300 w-12 text-right">
                  {{ reserveCashPercent }}%
                </span>
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ t('tools.positionSizing.reserveCashHint') }}
              </p>
            </div>

            <!-- Rounding Mode -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {{ t('tools.positionSizing.roundingMode') }}
              </label>
              <div class="grid grid-cols-3 gap-2">
                <button
                  @click="roundingMode = 'down'"
                  class="px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all"
                  :class="roundingMode === 'down'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'"
                >
                  {{ t('tools.positionSizing.roundDown') }}
                </button>
                <button
                  @click="roundingMode = 'nearest'"
                  class="px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all"
                  :class="roundingMode === 'nearest'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'"
                >
                  {{ t('tools.positionSizing.roundNearest') }}
                </button>
                <button
                  @click="roundingMode = 'up'"
                  class="px-3 py-2 text-sm font-medium rounded-lg border-2 transition-all"
                  :class="roundingMode === 'up'
                    ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'"
                >
                  {{ t('tools.positionSizing.roundUp') }}
                </button>
              </div>
            </div>
          </div>
        </details>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="isValidInput && calculationResults.length" class="space-y-6">
      <!-- Summary Cards -->
      <div v-if="summary" class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('tools.positionSizing.totalShares') }}</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatNumber(summary.totalShares) }}</div>
          <div class="text-xs text-gray-400">股</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('tools.positionSizing.totalInvested') }}</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ formatCurrency(summary.totalInvested) }}</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('tools.positionSizing.avgPrice') }}</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ summary.avgPrice.toFixed(2) }}</div>
          <div class="text-xs text-gray-400">元/股</div>
          <div class="text-xs text-gray-400 mt-1">（假設同價成交）</div>
        </div>
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">{{ t('tools.positionSizing.utilizationRate') }}</div>
          <div class="text-2xl font-bold text-gray-900 dark:text-white">{{ summary.utilizationRate.toFixed(1) }}%</div>
        </div>
      </div>

      <!-- Copy Button -->
      <div class="flex justify-end mb-4">
        <button
          @click="copyToClipboard"
          :disabled="!isValidInput"
          class="inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-all"
          :class="isValidInput
            ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
            : 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'"
        >
          <Icon
            :name="copySuccess ? 'heroicons:check' : 'heroicons:clipboard-document'"
            class="w-5 h-5 mr-2"
          />
          {{ copySuccess ? t('tools.positionSizing.copied') : t('tools.positionSizing.copyToClipboard') }}
        </button>
      </div>

      <!-- Detailed Cards (Mobile-friendly) -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('tools.positionSizing.detailTable') }}
          </h3>
        </div>
        
        <!-- Card Layout for Mobile -->
        <div class="divide-y divide-gray-200 dark:divide-gray-700">
          <div
            v-for="(result, index) in calculationResults"
            :key="index"
            class="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <!-- Batch Header -->
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-gray-900 dark:text-white">
                  {{ t('tools.positionSizing.table.batchN', { n: index + 1 }) }}
                </span>
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200">
                  {{ result.ratio }}%
                </span>
              </div>
              <div class="text-right">
                <div class="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                  {{ formatNumber(result.shares) }} {{ t('tools.positionSizing.shares') || '股' }}
                </div>
              </div>
            </div>
            
            <!-- Details Grid -->
            <div class="grid grid-cols-2 gap-3 text-sm">
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ t('tools.positionSizing.table.plannedAmount') }}
                </div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(result.amount) }}
                </div>
              </div>
              <div class="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div class="text-xs text-gray-500 dark:text-gray-400 mb-1">
                  {{ t('tools.positionSizing.table.actualAmount') }}
                </div>
                <div class="font-medium text-gray-900 dark:text-white">
                  {{ formatCurrency(result.actualAmount) }}
                </div>
              </div>
              <div class="bg-indigo-50 dark:bg-indigo-900/30 rounded-lg p-3 col-span-2">
                <div class="text-xs text-indigo-600 dark:text-indigo-400 mb-1">
                  {{ t('tools.positionSizing.table.cumulativeShares') }}
                </div>
                <div class="font-bold text-indigo-700 dark:text-indigo-300 text-lg">
                  {{ formatNumber(result.cumulativeShares) }} {{ t('tools.positionSizing.shares') || '股' }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Warnings -->
      <div v-if="warnings.length > 0" class="space-y-2">
        <div
          v-for="(warning, index) in warnings"
          :key="index"
          class="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4"
        >
          <div class="flex items-center">
            <Icon name="heroicons:exclamation-triangle" class="w-5 h-5 text-yellow-500 mr-2" />
            <span class="text-sm text-yellow-700 dark:text-yellow-300">{{ warning }}</span>
          </div>
        </div>
      </div>

      <!-- Cash Breakdown -->
      <div v-if="summary && (summary.reservedCash > 0 || summary.unallocatedCash > 0)" class="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 class="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-3">現金明細</h4>
        <div class="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div v-if="summary.reservedCash > 0" class="flex justify-between">
            <span class="text-blue-600 dark:text-blue-300">策略性保留：</span>
            <span class="font-medium text-blue-800 dark:text-blue-200">{{ formatCurrency(summary.reservedCash) }}</span>
          </div>
          <div v-if="summary.unallocatedCash > 0" class="flex justify-between">
            <span class="text-blue-600 dark:text-blue-300">技術性剩餘：</span>
            <span class="font-medium text-blue-800 dark:text-blue-200">{{ formatCurrency(summary.unallocatedCash) }}</span>
          </div>
          <div class="flex justify-between border-t md:border-t-0 md:border-l border-blue-200 dark:border-blue-700 pt-2 md:pt-0 md:pl-3">
            <span class="text-blue-600 dark:text-blue-300">總剩餘現金：</span>
            <span class="font-bold text-blue-800 dark:text-blue-200">{{ formatCurrency(summary.totalRemainingCash) }}</span>
          </div>
        </div>
      </div>

      <!-- Over Budget Warning -->
      <div v-if="summary && summary.isOverBudget" class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
        <div class="flex items-center">
          <Icon name="heroicons:exclamation-circle" class="w-5 h-5 text-red-500 mr-2" />
          <span class="text-sm text-red-700 dark:text-red-300">
            因進位導致超額投入 {{ formatCurrency(summary.overBudgetAmount) }}，已自動調整最後一批股數
          </span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-12 text-center">
      <Icon name="heroicons:calculator" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <p class="text-gray-500 dark:text-gray-400">
        {{ t('tools.positionSizing.emptyState') }}
      </p>
    </div>

    <!-- Strategy Description -->
    <div class="mt-8 bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {{ selectedStrategy.name }}
      </h2>
      <p class="text-gray-600 dark:text-gray-400 mb-4">
        {{ selectedStrategy.description }}
      </p>
      
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-green-700 dark:text-green-400 mb-2">
            {{ t('tools.positionSizing.pros') }}
          </h3>
          <ul class="space-y-1">
            <li v-for="(pro, index) in selectedStrategy.pros" :key="index" class="text-sm text-green-600 dark:text-green-300 flex items-start">
              <Icon name="heroicons:check" class="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5" />
              {{ pro }}
            </li>
          </ul>
        </div>
        <div class="bg-red-50 dark:bg-red-900/20 rounded-lg p-4">
          <h3 class="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
            {{ t('tools.positionSizing.cons') }}
          </h3>
          <ul class="space-y-1">
            <li v-for="(con, index) in selectedStrategy.cons" :key="index" class="text-sm text-red-600 dark:text-red-300 flex items-start">
              <Icon name="heroicons:x-mark" class="w-4 h-4 mr-1.5 flex-shrink-0 mt-0.5" />
              {{ con }}
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- All Strategies Overview -->
    <div class="mt-8">
      <h2 class="text-xl font-semibold text-gray-900 dark:text-white mb-4">
        {{ t('tools.positionSizing.allStrategies') }}
      </h2>
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div 
          v-for="strategy in strategies" 
          :key="strategy.id"
          class="bg-white dark:bg-gray-800 rounded-lg shadow p-4 cursor-pointer hover:shadow-md transition-shadow"
          :class="{ 'ring-2 ring-indigo-500': selectedStrategyId === strategy.id }"
          @click="selectedStrategyId = strategy.id"
        >
          <h3 class="font-semibold text-gray-900 dark:text-white mb-2">{{ strategy.name }}</h3>
          <div class="flex gap-1 mb-2">
            <span 
              v-for="(ratio, index) in strategy.ratios" 
              :key="index"
              class="px-2 py-1 text-xs font-medium rounded bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300"
            >
              {{ ratio }}%
            </span>
          </div>
          <p class="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">
            {{ strategy.description }}
          </p>
        </div>
      </div>
    </div>

    <!-- Privacy Note -->
    <div class="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
      <p class="text-sm text-green-700 dark:text-green-300 text-center">
        {{ t('tools.positionSizing.privacyNote') }}
      </p>
    </div>

    <!-- Disclaimer -->
    <div class="mt-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
      <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
        {{ t('tools.positionSizing.disclaimer') }}
      </p>
    </div>
  </div>
</template>
