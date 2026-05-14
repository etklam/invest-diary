<script setup lang="ts">
import {
  calculateRelativeValue,
  formatPrice,
  formatRatio,
  parseTargetPrices,
  generatePricePoints,
  type CalculationResult,
  type PricePoint
} from '~/lib/relativeValue'
import { getYahooSymbolAliasSuggestion } from '~/lib/market-data/yahoo'
import type { QuoteResponse, HistoricalQuote } from '~/lib/market-data/yahoo'
import QuoteInput from '~/components/QuoteInput.vue'
import { Line } from 'vue-chartjs'
import {
  Chart as ChartJS,
  type ChartData,
  type ChartOptions,
  Title,
  Tooltip,
  Legend,
  LineElement,
  LinearScale,
  CategoryScale,
  PointElement
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, LineElement, LinearScale, CategoryScale, PointElement)

const { t, locale } = useI18n()
const toast = useToast()

// Primary stock (主股票)
const primarySymbol = ref<string>('')
const primaryPrice = ref<number | null>(null)
const primaryLoading = ref(false)
const primaryQuote = ref<QuoteResponse | null>(null)
const primaryError = ref('')

// Relative stock (相對股票)
const relativeSymbol = ref<string>('')
const relativePrice = ref<number | null>(null)
const relativeLoading = ref(false)
const relativeQuote = ref<QuoteResponse | null>(null)
const relativeError = ref('')

// Historical Data
const historicalRange = ref<'1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max'>('1y')
const primaryHistoricalData = ref<HistoricalQuote[]>([])
const relativeHistoricalData = ref<HistoricalQuote[]>([])
const historicalLoading = ref(false)

function formatHistoricalLabel(timestamp: number): string {
  return new Date(timestamp * 1000).toLocaleDateString(locale.value, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

const historicalRatioData = computed<ChartData<'line'>>(() => {
  if (primaryHistoricalData.value.length === 0 || relativeHistoricalData.value.length === 0) {
    return {
      labels: [],
      datasets: []
    }
  }

  const relativeMap = new Map(relativeHistoricalData.value.map(d => [d.timestamp, d.close]))

  const labels: string[] = []
  const ratios: number[] = []

  // Iterate through primary data and find corresponding relative data by timestamp
  for (const primaryQuote of primaryHistoricalData.value) {
    const relativeClose = relativeMap.get(primaryQuote.timestamp)

    if (primaryQuote.close !== null && typeof relativeClose === 'number' && relativeClose !== 0) {
      labels.push(formatHistoricalLabel(primaryQuote.timestamp))
      ratios.push(primaryQuote.close / relativeClose)
    }
  }

  return {
    labels,
    datasets: [
      {
        label: `${primarySymbol.value} / ${relativeSymbol.value} Ratio`,
        backgroundColor: '#f6ad55', // amber-400
        borderColor: '#f6ad55',
        data: ratios,
        tension: 0.3,
        pointRadius: 0
      }
    ]
  }
})

const hasHistoricalRatioData = computed(() => (historicalRatioData.value.labels?.length ?? 0) > 0)

const chartOptions: ChartOptions<'line'> = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: {
      title: {
        display: true,
        text: 'Date'
      }
    },
    y: {
      title: {
        display: true,
        text: 'Ratio'
      }
    }
  },
  plugins: {
    tooltip: {
      callbacks: {
        label(context) {
          let label = context.dataset.label || ''
          if (label) {
            label += ': '
          }
          if (context.parsed.y !== null) {
            label += formatRatio(context.parsed.y)
          }
          return label
        }
      }
    }
  }
}

async function fetchHistoricalDataForSymbols() {
  if (!primarySymbol.value.trim() || !relativeSymbol.value.trim()) {
    primaryHistoricalData.value = []
    relativeHistoricalData.value = []
    return
  }

  historicalLoading.value = true
  try {
    const buildHistoricalUrl = (symbol: string) => {
      const params = new URLSearchParams({
        symbol,
        range: historicalRange.value,
      })

      return `/api/market/historical?${params.toString()}`
    }

    const [primaryData, relativeData] = await Promise.all([
      $fetch<HistoricalQuote[]>(buildHistoricalUrl(primarySymbol.value)),
      $fetch<HistoricalQuote[]>(buildHistoricalUrl(relativeSymbol.value))
    ])
    primaryHistoricalData.value = primaryData
    relativeHistoricalData.value = relativeData
  } catch {
    toast.error(t('tools.relativeValue.historicalDataFetchFailed'))
    primaryHistoricalData.value = []
    relativeHistoricalData.value = []
  } finally {
    historicalLoading.value = false
  }
}

watch([primarySymbol, relativeSymbol, historicalRange], fetchHistoricalDataForSymbols, { immediate: true })

interface RelativeValuePreset {
  primarySymbol: string
  relativeSymbol: string
  name: string
  description: string
}

interface ApiErrorLike {
  statusMessage?: string
  message?: string
  data?: {
    statusMessage?: string
  }
}

const presets: RelativeValuePreset[] = [
  { primarySymbol: '^GSPC', relativeSymbol: 'SPY', name: 'S&P 500', description: 'Index vs ETF' },
  { primarySymbol: 'SPY', relativeSymbol: 'SPLG', name: 'SPY vs SPLG', description: 'Standard vs low-cost' },
  { primarySymbol: 'QQQ', relativeSymbol: 'QQQM', name: 'QQQ vs QQQM', description: 'NASDAQ variants' },
  { primarySymbol: 'GLD', relativeSymbol: 'GLDM', name: 'GLD vs GLDM', description: 'Gold variants' }
]

// Target prices
const targetPricesInput = ref<string>('')
const targetPriceInputMode = ref<'manual' | 'auto'>('auto')
const pricePointCount = ref<number>(5)
const pricePointStep = ref<number>(50)
const pricePointDirection = ref<'up' | 'down' | 'both'>('both')

// Computed
const isValidInput = computed(() =>
  primaryPrice.value !== null &&
  primaryPrice.value > 0 &&
  relativePrice.value !== null &&
  relativePrice.value > 0
)

const targetPrices = computed(() => {
  if (targetPriceInputMode.value === 'manual' && targetPricesInput.value.trim()) {
    return parseTargetPrices(targetPricesInput.value)
  }
  // Auto-generate price points
  if (targetPriceInputMode.value === 'auto' && primaryPrice.value) {
    return generatePricePoints(
      primaryPrice.value,
      pricePointCount.value,
      pricePointStep.value,
      pricePointDirection.value
    )
  }
  return []
})

const calculationResult = computed((): CalculationResult | null => {
  if (!isValidInput.value ||
      !primarySymbol.value ||
      !relativeSymbol.value ||
      targetPrices.value.length === 0) {
    return null
  }

  return calculateRelativeValue({
    primarySymbol: primarySymbol.value.toUpperCase(),
    primaryPrice: primaryPrice.value!,
    relativeSymbol: relativeSymbol.value.toUpperCase(),
    relativePrice: relativePrice.value!,
    targetPrices: targetPrices.value
  })
})

const sortedPriceTable = computed((): PricePoint[] => {
  if (!calculationResult.value) return []
  return [...calculationResult.value.priceTable].sort((a, b) => b.targetPrice - a.targetPrice)
})

const primarySymbolSuggestion = computed(() => getYahooSymbolAliasSuggestion(primarySymbol.value))
const relativeSymbolSuggestion = computed(() => getYahooSymbolAliasSuggestion(relativeSymbol.value))
const symbolsMatch = computed(() =>
  primarySymbol.value.trim().toUpperCase() !== '' &&
  primarySymbol.value.trim().toUpperCase() === relativeSymbol.value.trim().toUpperCase()
)

// Watch symbol changes to auto-uppercase
// Logic moved to QuoteInput component

function buildQuoteErrorMessage(symbol: string, suggestion: string | null, error: ApiErrorLike | null | undefined): string {
  const statusMessage = error?.data?.statusMessage || error?.statusMessage || error?.message || ''

  if (typeof statusMessage === 'string' && statusMessage.includes('Too many requests')) {
    return t('tools.relativeValue.rateLimited')
  }

  if (suggestion) {
    return `${t('tools.relativeValue.fetchFailedFor')} ${symbol}. ${t('tools.relativeValue.tryYahooSymbol')} ${suggestion}. ${t('tools.relativeValue.manualPriceHint')}`
  }

  return `${t('tools.relativeValue.fetchFailedFor')} ${symbol}. ${t('tools.relativeValue.manualPriceHint')}`
}

function buildQuoteUrl(symbol: string): string {
  return `/api/market/quote/${encodeURIComponent(symbol.trim())}`
}

// Fetch quote functions
async function fetchPrimaryQuote() {
  if (!primarySymbol.value.trim()) {
    primaryError.value = t('tools.relativeValue.symbolRequired')
    toast.error(t('tools.relativeValue.symbolRequired'))
    return
  }

  primaryLoading.value = true
  primaryError.value = ''
  try {
    const response = await $fetch<QuoteResponse>(buildQuoteUrl(primarySymbol.value))
    primaryQuote.value = response
    primaryPrice.value = response.regularMarketPrice
  } catch (error: unknown) {
    primaryError.value = buildQuoteErrorMessage(
      primarySymbol.value,
      primarySymbolSuggestion.value,
      error as ApiErrorLike
    )
    toast.error(primaryError.value, 5000)
  } finally {
    primaryLoading.value = false
  }
}

async function fetchRelativeQuote() {
  if (!relativeSymbol.value.trim()) {
    relativeError.value = t('tools.relativeValue.symbolRequired')
    toast.error(t('tools.relativeValue.symbolRequired'))
    return
  }

  relativeLoading.value = true
  relativeError.value = ''
  try {
    const response = await $fetch<QuoteResponse>(buildQuoteUrl(relativeSymbol.value))
    relativeQuote.value = response
    relativePrice.value = response.regularMarketPrice
  } catch (error: unknown) {
    relativeError.value = buildQuoteErrorMessage(
      relativeSymbol.value,
      relativeSymbolSuggestion.value,
      error as ApiErrorLike
    )
    toast.error(relativeError.value, 5000)
  } finally {
    relativeLoading.value = false
  }
}

async function fetchAllQuotes() {
  await Promise.all([
    fetchPrimaryQuote(),
    fetchRelativeQuote()
  ])
}

function loadExample() {
  primarySymbol.value = '^GSPC'
  relativeSymbol.value = 'SPY'
  void fetchAllQuotes()
}

function applyPreset(preset: RelativeValuePreset) {
  primarySymbol.value = preset.primarySymbol
  relativeSymbol.value = preset.relativeSymbol
  void fetchAllQuotes()
}

function selectPriceTableRow(targetPrice: number, correspondingPrice: number) {
  primaryPrice.value = targetPrice
  relativePrice.value = correspondingPrice
  // Optionally, set the targetPriceInputMode to manual if coming from auto-generated table
  targetPriceInputMode.value = 'manual'
}

// Copy to clipboard
const copySuccess = ref(false)

const generateMarkdown = (): string => {
  if (!calculationResult.value) return ''

  const result = calculationResult.value
  const lines: string[] = []

  lines.push(`# ${t('tools.relativeValue.markdown.title')} ${result.primarySymbol} / ${result.relativeSymbol}`)
  lines.push('')
  lines.push(`**${t('tools.relativeValue.currentPrices')}**`)
  lines.push('')
  lines.push(`| ${t('tools.relativeValue.symbol')} | ${t('tools.relativeValue.price')} | ${t('tools.relativeValue.change')} |`)
  lines.push(`|------|------|------|`)

  if (primaryQuote.value) {
    const q = primaryQuote.value
    const changeStr = `${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`
    lines.push(`| ${result.primarySymbol} | ${formatPrice(q.regularMarketPrice)} | ${changeStr} |`)
  }

  if (relativeQuote.value) {
    const q = relativeQuote.value
    const changeStr = `${q.change >= 0 ? '+' : ''}${q.change.toFixed(2)} (${q.changePercent >= 0 ? '+' : ''}${q.changePercent.toFixed(2)}%)`
    lines.push(`| ${result.relativeSymbol} | ${formatPrice(q.regularMarketPrice)} | ${changeStr} |`)
  }

  lines.push('')
  lines.push(`**${t('tools.relativeValue.markdown.ratio')}**`)
  lines.push('')
  lines.push(`- **${result.primarySymbol} / ${result.relativeSymbol}**: ${formatRatio(result.ratio)}`)
  lines.push(`- **${result.relativeSymbol} / ${result.primarySymbol}**: ${formatRatio(result.inverseRatio)}`)
  lines.push('')
  lines.push(`**${t('tools.relativeValue.markdown.priceTable')}**`)
  lines.push('')
  lines.push(`| ${result.primarySymbol} | ${result.relativeSymbol} |`)
  lines.push(`|------|------|`)

  for (const row of sortedPriceTable.value) {
    lines.push(`| ${formatPrice(row.targetPrice)} | ${formatPrice(row.correspondingPrice)} |`)
  }

  lines.push('')
  lines.push(`> ${t('tools.relativeValue.markdown.generatedBy')}`)
  lines.push(`> ${t('tools.relativeValue.markdown.lastUpdate')}: ${new Date().toLocaleString()}`)

  return lines.join('\n')
}

const copyToClipboard = async () => {
  const markdown = generateMarkdown()
  if (!markdown) return

  try {
    await navigator.clipboard.writeText(markdown)
    copySuccess.value = true
    toast.success(t('tools.relativeValue.copied'))
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {
    toast.error(t('tools.relativeValue.copyFailed'))
  }
}

useHead({
  title: computed(() => `${t('tools.relativeValue.title')} - ${t('nav.tools')}`),
  meta: [
    {
      name: 'description',
      content: computed(() => t('tools.relativeValue.subtitle'))
    },
    {
      property: 'og:locale',
      content: computed(() => locale.value)
    }
  ]
})

definePageMeta({
  requiresAuth: false
})
</script>

<template>
  <div class="relative-value-page">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Header -->
      <header class="mb-10 text-center sm:mb-12">
        <div class="mb-4 inline-flex items-center gap-2 rounded-full px-4 py-2" style="background: color-mix(in srgb, var(--color-secondary) 12%, var(--color-surface))">
          <Icon name="heroicons:calculator" class="h-4 w-4" style="color: var(--color-secondary)" />
          <span class="text-xs font-semibold uppercase tracking-wider" style="color: var(--color-secondary)">
            {{ t('tools.relativeValue.heroKicker') }}
          </span>
        </div>
        <h1 class="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
          {{ t('tools.relativeValue.title') }}
        </h1>
        <p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed sm:text-base" style="color: var(--color-text-muted)">
          {{ t('tools.relativeValue.subtitle') }}
        </p>
      </header>

      <!-- Main Content Grid -->
      <div class="grid gap-6 lg:grid-cols-12">
        <!-- Left Column: Inputs -->
        <div class="lg:col-span-7">
          <!-- Quick Presets -->
          <section class="mb-6">
            <div class="mb-4 flex items-center gap-2">
              <Icon name="heroicons:lightning-bolt" class="h-5 w-5" style="color: var(--color-secondary)" />
              <h2 class="text-lg font-semibold">
                {{ t('tools.relativeValue.commonPresets') }}
              </h2>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="preset in presets"
                :key="`${preset.primarySymbol}-${preset.relativeSymbol}`"
                type="button"
                :data-testid="`preset-${preset.primarySymbol.replace(/[^A-Z0-9]/gi, '_')}-${preset.relativeSymbol.replace(/[^A-Z0-9]/gi, '_')}`"
                class="group flex cursor-pointer items-center gap-4 rounded-2xl border p-4 transition-all duration-200 hover:shadow-lg"
                style="border-color: var(--color-border); background: var(--color-surface)"
                @click="applyPreset(preset)"
              >
                <div class="flex h-12 w-12 items-center justify-center rounded-xl text-white shadow-lg transition-transform duration-200 group-hover:scale-110" style="background: linear-gradient(to bottom right, var(--color-secondary), color-mix(in srgb, var(--color-secondary) 85%, black))">
                  <Icon name="heroicons:chart-bar" class="h-6 w-6" />
                </div>
                <div class="text-left">
                  <div class="font-semibold" style="color: var(--color-text)">
                    {{ preset.primarySymbol }} / {{ preset.relativeSymbol }}
                  </div>
                  <div class="text-sm" style="color: var(--color-text-soft)">
                    {{ preset.description }}
                  </div>
                </div>
                <Icon name="heroicons:arrow-right" class="ml-auto h-5 w-5 group-hover:translate-x-1 transition-all duration-200" style="color: var(--color-text-soft)" />
              </button>
            </div>
          </section>

          <!-- Stock Input Cards -->
          <div class="mb-6 grid gap-6 sm:grid-cols-2">
            <!-- Primary Stock -->
            <QuoteInput
              v-model="primarySymbol"
              :price="primaryPrice"
              :loading="primaryLoading"
              :error="primaryError"
              :quote="primaryQuote"
              :symbol-suggestion="primarySymbolSuggestion"
              :is-primary="true"
              @update:price="primaryPrice = $event"
              @fetch-quote="fetchPrimaryQuote"
            />

            <!-- Relative Stock -->
            <QuoteInput
              v-model="relativeSymbol"
              :price="relativePrice"
              :loading="relativeLoading"
              :error="relativeError"
              :quote="relativeQuote"
              :symbol-suggestion="relativeSymbolSuggestion"
              :is-primary="false"
              @update:price="relativePrice = $event"
              @fetch-quote="fetchRelativeQuote"
            />
          </div>

          <!-- Target Prices -->
          <section class="rounded-3xl border p-6" style="border-color: var(--color-border); background: var(--color-surface)">
            <div class="mb-4 flex items-center gap-2">
              <Icon name="heroicons:table-cells" class="h-5 w-5" style="color: var(--color-secondary)" />
              <h2 class="text-lg font-semibold">
                {{ t('tools.relativeValue.targetPrices') }}
              </h2>
            </div>

            <div v-if="symbolsMatch" class="mb-4 rounded-2xl px-4 py-3 text-sm" style="border: 1px solid color-mix(in srgb, var(--color-warning) 40%, var(--color-border)); background: color-mix(in srgb, var(--color-warning) 8%, var(--color-surface)); color: var(--color-text)">
              {{ t('tools.relativeValue.sameSymbolWarning') }}
            </div>

            <!-- Tab Buttons -->
            <div class="mb-6 flex rounded-xl border p-1" style="border-color: var(--color-border); background: var(--color-surface)">
              <button
                type="button"
                class="rv-tab flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                :class="targetPriceInputMode === 'manual' ? 'rv-tab-active' : 'rv-tab-inactive'"
                @click="targetPriceInputMode = 'manual'"
              >
                {{ t('tools.relativeValue.manualInput') }}
              </button>
              <button
                type="button"
                class="rv-tab flex-1 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                :class="targetPriceInputMode === 'auto' ? 'rv-tab-active' : 'rv-tab-inactive'"
                @click="targetPriceInputMode = 'auto'"
              >
                {{ t('tools.relativeValue.autoGenerate') }}
              </button>
            </div>

            <div class="grid gap-6 lg:grid-cols-2">
              <!-- Manual Input Content -->
              <div v-if="targetPriceInputMode === 'manual'">
                <label for="target-prices" class="mb-1.5 block text-sm font-medium" style="color: var(--color-text)">
                  {{ t('tools.relativeValue.targetPricesInput') }}
                </label>
                <div class="relative">
                  <textarea
                    id="target-prices"
                    v-model="targetPricesInput"
                    rows="5"
                    :placeholder="t('tools.relativeValue.targetPricesPlaceholder')"
                    class="rv-input w-full rounded-xl px-4 py-3 text-sm font-mono transition-all duration-200 focus:outline-none"
                  />
                  <button
                    v-if="targetPricesInput"
                    type="button"
                    class="absolute right-3 top-3 rounded-lg p-1.5 transition-colors" style="background: var(--color-surface-muted); color: var(--color-text-soft)"
                    @click="targetPricesInput = ''"
                  >
                    <Icon name="heroicons:x-mark" class="h-4 w-4" />
                  </button>
                </div>
                <p class="mt-2 text-xs" style="color: var(--color-text-soft)">
                  {{ t('tools.relativeValue.targetPricesHint') }}
                </p>
              </div>

              <!-- Auto Generate Content -->
              <div v-if="targetPriceInputMode === 'auto'" class="space-y-4">
                <div class="rounded-xl p-4" style="background: var(--color-surface-muted)">
                  <div class="flex items-center gap-2 text-sm font-medium" style="color: var(--color-text)">
                    <Icon name="heroicons:sparkles" class="h-4 w-4" style="color: var(--color-secondary)" />
                    {{ t('tools.relativeValue.autoGeneratePricePoints') }}
                  </div>
                  <p class="mt-1 text-xs" style="color: var(--color-text-soft)">
                    {{ t('tools.relativeValue.basedOnPrimaryPrice', { symbol: primarySymbol || t('tools.relativeValue.primary') }) }}
                  </p>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label for="price-count" class="mb-1.5 block text-xs font-medium" style="color: var(--color-text-soft)">
                      {{ t('tools.relativeValue.pricePointCount') }}
                    </label>
                    <input
                      id="price-count"
                      v-model.number="pricePointCount"
                      type="number"
                      min="1"
                      max="20"
                      class="rv-input w-full rounded-lg px-3 py-2 text-center text-sm font-medium transition-all duration-200 focus:outline-none"
                    >
                  </div>
                  <div>
                    <label for="price-step" class="mb-1.5 block text-xs font-medium" style="color: var(--color-text-soft)">
                      {{ t('tools.relativeValue.pricePointStep') }}
                    </label>
                    <input
                      id="price-step"
                      v-model.number="pricePointStep"
                      type="number"
                      min="1"
                      step="1"
                      class="rv-input w-full rounded-lg px-3 py-2 text-center text-sm font-medium transition-all duration-200 focus:outline-none"
                    >
                  </div>
                  <div>
                    <label class="mb-1.5 block text-xs font-medium" style="color: var(--color-text-soft)">
                      {{ t('tools.relativeValue.pricePointDirection') }}
                    </label>
                    <div class="flex rounded-lg border overflow-hidden" style="border-color: var(--color-border); background: var(--color-surface)">
                      <button
                        type="button"
                        class="rv-tab flex-1 px-2 py-2 text-xs font-medium transition-all duration-200"
                        :class="pricePointDirection === 'up' ? 'rv-tab-active' : 'rv-tab-inactive'"
                        @click="pricePointDirection = 'up'"
                      >
                        {{ t('tools.relativeValue.directionUp') }}
                      </button>
                      <button
                        type="button"
                        class="rv-tab flex-1 px-2 py-2 text-xs font-medium transition-all duration-200 border-l" style="border-color: var(--color-border)"
                        :class="pricePointDirection === 'down' ? 'rv-tab-active' : 'rv-tab-inactive'"
                        @click="pricePointDirection = 'down'"
                      >
                        {{ t('tools.relativeValue.directionDown') }}
                      </button>
                      <button
                        type="button"
                        class="rv-tab flex-1 px-2 py-2 text-xs font-medium transition-all duration-200 border-l" style="border-color: var(--color-border)"
                        :class="pricePointDirection === 'both' ? 'rv-tab-active' : 'rv-tab-inactive'"
                        @click="pricePointDirection = 'both'"
                      >
                        {{ t('tools.relativeValue.directionBoth') }}
                      </button>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  data-testid="load-example-button"
                  class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 px-4 py-3 text-sm font-medium text-slate-600 transition-all duration-200 hover:border-sky-500 hover:bg-sky-50/50 hover:text-sky-600 dark:border-slate-700 dark:text-slate-400 dark:hover:border-sky-500 dark:hover:bg-sky-950/30 dark:hover:text-sky-400"
                  @click="loadExample"
                >
                  <Icon name="heroicons:lightning-bolt" class="h-4 w-4" />
                  {{ t('tools.relativeValue.loadExample') }}: ^GSPC / SPY
                </button>
              </div>
            </div>
          </section>
        </div>

        <!-- Right Column: Results -->
        <div class="lg:col-span-5">
          <div class="sticky top-6 space-y-6">
            <!-- Historical Ratio Chart -->
            <section
              v-if="primarySymbol.trim() && relativeSymbol.trim()"
              class="overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-sm dark:border-slate-700/60 dark:from-slate-800/90 dark:to-slate-800/60"
            >
              <div class="relative h-2 bg-gradient-to-r from-sky-500 via-violet-500 to-amber-500" />
              <div class="p-6">
                <div class="mb-5 flex items-center justify-between">
                  <div class="flex items-center gap-2">
                    <Icon name="heroicons:chart-line" class="h-5 w-5 text-sky-500" />
                    <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                      {{ t('tools.relativeValue.historicalRatio') }}
                    </h3>
                  </div>
                  <div class="flex gap-2">
                    <button
                      v-for="rangeOption in ['1mo', '3mo', '6mo', '1y', '5y', 'max']"
                      :key="rangeOption"
                      type="button"
                      class="rounded-full px-3 py-1 text-xs font-medium"
                      :class="historicalRange === rangeOption ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600'"
                      @click="historicalRange = rangeOption as '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max'"
                    >
                      {{ rangeOption.toUpperCase() }}
                    </button>
                  </div>
                </div>

                <div v-if="historicalLoading" class="flex items-center justify-center h-48">
                  <Icon name="heroicons:arrow-path" class="h-8 w-8 animate-spin text-sky-500" />
                </div>
                <div v-else-if="hasHistoricalRatioData">
                  <Line
                    :data="historicalRatioData"
                    :options="chartOptions"
                    class="h-72"
                  />
                </div>
                <div v-else class="text-center text-sm text-slate-500 dark:text-slate-400 h-48 flex items-center justify-center">
                  {{ t('tools.relativeValue.noHistoricalData') }}
                </div>
              </div>
            </section>
            <!-- Ratio Display -->
            <div v-if="calculationResult" class="overflow-hidden rounded-3xl border border-slate-200/60 bg-gradient-to-br from-white/90 to-white/60 backdrop-blur-sm dark:border-slate-700/60 dark:from-slate-800/90 dark:to-slate-800/60">
              <!-- Decorative gradient header -->
              <div class="relative h-2 bg-gradient-to-r from-amber-500 via-violet-500 to-sky-500" />

              <div class="p-6">
                <div class="mb-5 flex items-center gap-2">
                  <Icon name="heroicons:chart-pie" class="h-5 w-5 text-violet-500" />
                  <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                    {{ t('tools.relativeValue.priceRatio') }}
                  </h3>
                </div>

                <div class="space-y-3">
                  <!-- Main Ratio -->
                  <div class="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 transition-all duration-200 hover:border-amber-500/30 hover:bg-amber-50/30 dark:border-slate-700/60 dark:bg-slate-900/60 dark:hover:border-amber-500/20 dark:hover:bg-amber-950/20">
                    <div class="absolute inset-0 bg-gradient-to-r from-amber-500/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    <div class="relative">
                      <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {{ calculationResult.primarySymbol }} / {{ calculationResult.relativeSymbol }}
                      </div>
                      <div class="mt-2 text-3xl font-mono font-bold text-slate-900 dark:text-white">
                        {{ formatRatio(calculationResult.ratio) }}
                      </div>
                    </div>
                  </div>

                  <!-- Inverse Ratio -->
                  <div class="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 transition-all duration-200 hover:border-violet-500/30 hover:bg-violet-50/30 dark:border-slate-700/60 dark:bg-slate-900/60 dark:hover:border-violet-500/20 dark:hover:bg-violet-950/20">
                    <div class="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
                    <div class="relative">
                      <div class="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {{ calculationResult.relativeSymbol }} / {{ calculationResult.primarySymbol }}
                      </div>
                      <div class="mt-2 text-3xl font-mono font-bold text-slate-900 dark:text-white">
                        {{ formatRatio(calculationResult.inverseRatio) }}
                      </div>
                    </div>
                  </div>
                </div>

                <!-- Copy Button -->
                <button
                  type="button"
                  class="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-slate-200/60 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition-all duration-200 hover:border-violet-500 hover:bg-violet-50 hover:text-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-violet-500 dark:hover:bg-violet-950/30 dark:hover:text-violet-400 dark:focus:ring-offset-slate-900"
                  @click="copyToClipboard"
                >
                  <Icon :name="copySuccess ? 'heroicons:check-circle' : 'heroicons:clipboard-document'" class="h-5 w-5" :class="{ 'text-emerald-500': copySuccess }" />
                  {{ copySuccess ? t('tools.relativeValue.copied') : t('tools.relativeValue.copyToClipboard') }}
                </button>
              </div>
            </div>

            <!-- Price Table -->
            <div v-if="sortedPriceTable.length > 0" class="overflow-hidden rounded-3xl border border-slate-200/60 bg-white/80 backdrop-blur-sm dark:border-slate-700/60 dark:bg-slate-800/60">
              <div class="flex items-center justify-between border-b border-slate-200/60 px-6 py-4 dark:border-slate-700/60">
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:table" class="h-5 w-5 text-sky-500" />
                  <h3 class="text-lg font-semibold text-slate-900 dark:text-white">
                    {{ t('tools.relativeValue.priceTable') }}
                  </h3>
                </div>
                <span class="rounded-full bg-sky-500/10 px-3 py-1 text-xs font-semibold text-sky-600 dark:text-sky-400">
                  {{ sortedPriceTable.length }} points
                </span>
              </div>

              <div class="max-h-[500px] overflow-y-auto">
                <table class="w-full text-sm">
                  <thead class="sticky top-0 bg-white/95 backdrop-blur-sm dark:bg-slate-800/95">
                    <tr class="border-b border-slate-200/60 dark:border-slate-700/60">
                      <th class="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                        {{ calculationResult?.primarySymbol || t('tools.relativeValue.primarySymbol') }}
                      </th>
                      <th class="px-6 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                        {{ calculationResult?.relativeSymbol || t('tools.relativeValue.relativeSymbol') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(row, index) in sortedPriceTable"
                      :key="index"
                      class="group cursor-pointer border-b border-slate-100/60 last:border-0 transition-colors duration-150 hover:bg-slate-50/50 dark:border-slate-800/60 dark:hover:bg-slate-700/30"
                      :class="{ 'bg-amber-50/50 dark:bg-amber-950/20': row.targetPrice === primaryPrice }"
                      @click="selectPriceTableRow(row.targetPrice, row.correspondingPrice)"
                    >
                      <td class="px-6 py-3 font-mono font-medium text-slate-900 dark:text-white">
                        {{ formatPrice(row.targetPrice) }}
                      </td>
                      <td class="px-6 py-3 text-right font-mono font-medium text-slate-900 dark:text-white">
                        {{ formatPrice(row.correspondingPrice) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Empty State -->
            <div v-else class="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-300 bg-slate-50/50 p-10 text-center dark:border-slate-700 dark:bg-slate-800/30">
              <div class="relative mb-6">
                <div class="absolute inset-0 animate-pulse rounded-full bg-sky-500/10 blur-xl" />
                <Icon name="heroicons:chart-bar" class="relative h-20 w-20 text-slate-300 dark:text-slate-300" />
              </div>
              <h3 class="mb-2 text-lg font-semibold text-slate-700 dark:text-slate-300">
                No data yet
              </h3>
              <p class="max-w-xs text-sm text-slate-500 dark:text-slate-400">
                {{ t('tools.relativeValue.emptyState') }}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.relative-value-page {
  font-family: var(--font-body);
  background: var(--color-background);
  min-height: 100vh;
}

/* Typography overrides */
.relative-value-page h1 {
  font-family: var(--font-display);
  color: var(--color-text);
}

.relative-value-page h2,
.relative-value-page h3 {
  color: var(--color-text);
}

/* Mono values */
.relative-value-page .font-mono {
  font-family: var(--font-data);
}

/* Custom scrollbar */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: transparent;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background-color: var(--color-border);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background-color: var(--color-text-soft);
}

/* Card overrides — scoped specificity beats Tailwind */
.relative-value-page :deep(.rounded-3xl),
.relative-value-page .rounded-3xl {
  border-radius: var(--radius-md);
}

.relative-value-page :deep(.rounded-2xl),
.relative-value-page .rounded-2xl {
  border-radius: var(--radius-sm);
}
</style>
