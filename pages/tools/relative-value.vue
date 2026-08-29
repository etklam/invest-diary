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
import LedgerCard from '~/components/LedgerCard.vue'
import BaseButton from '~/components/BaseButton.vue'
import { useResearchCapture } from '~/composables/useResearchCapture'
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
const researchCapture = useResearchCapture()

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

function openRelativeValueCapture(): void {
  const result = calculationResult.value
  if (!result) return

  const range = historicalRange.value
  const sourceTitle = `${result.primarySymbol} vs ${result.relativeSymbol} · ${range}`
  researchCapture.open({
    sourceLabel: `${t('researchCapture.sources.relativeValue')} · ${result.primarySymbol} vs ${result.relativeSymbol}`,
    suggestedInsight: t('researchCapture.context.relativeValueObservation', {
      primary: result.primarySymbol,
      relative: result.relativeSymbol,
      ratio: formatRatio(result.ratio),
      range,
    }),
    metadata: {
      sourceType: 'RELATIVE_VALUE',
      sourceTitle,
      occurredAt: new Date().toISOString(),
      metadataJson: JSON.stringify({
        primarySymbol: result.primarySymbol,
        relativeSymbol: result.relativeSymbol,
        ratio: result.ratio,
        historicalRange: range,
      }),
    },
  })
}

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

const createQuoteFetcher = (target: {
  symbol: typeof primarySymbol
  price: typeof primaryPrice
  loading: typeof primaryLoading
  quote: typeof primaryQuote
  error: typeof primaryError
  suggestion: typeof primarySymbolSuggestion
}) => async () => {
  if (!target.symbol.value.trim()) {
    target.error.value = t('tools.relativeValue.symbolRequired')
    toast.error(t('tools.relativeValue.symbolRequired'))
    return
  }

  target.loading.value = true
  target.error.value = ''
  try {
    const response = await $fetch<QuoteResponse>(buildQuoteUrl(target.symbol.value))
    target.quote.value = response
    target.price.value = response.regularMarketPrice
  } catch (error: unknown) {
    target.error.value = buildQuoteErrorMessage(
      target.symbol.value,
      target.suggestion.value,
      error as ApiErrorLike
    )
    toast.error(target.error.value, 5000)
  } finally {
    target.loading.value = false
  }
}

const fetchPrimaryQuote = createQuoteFetcher({
  symbol: primarySymbol,
  price: primaryPrice,
  loading: primaryLoading,
  quote: primaryQuote,
  error: primaryError,
  suggestion: primarySymbolSuggestion,
})

const fetchRelativeQuote = createQuoteFetcher({
  symbol: relativeSymbol,
  price: relativePrice,
  loading: relativeLoading,
  quote: relativeQuote,
  error: relativeError,
  suggestion: relativeSymbolSuggestion,
})

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
  <div class="min-h-screen bg-dt-bg font-body">
    <div class="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <!-- Header -->
      <header class="mb-10 text-center sm:mb-12">
        <div class="mb-4 inline-flex items-center gap-2 rounded-full border border-dt-secondary/20 bg-dt-surface px-4 py-2">
          <Icon name="heroicons:calculator" class="h-4 w-4 text-dt-secondary" />
          <span class="text-xs font-semibold uppercase tracking-wider text-dt-secondary">
            {{ t('tools.relativeValue.heroKicker') }}
          </span>
        </div>
        <h1 class="font-display text-3xl font-bold tracking-tight text-dt-text sm:text-4xl lg:text-5xl">
          {{ t('tools.relativeValue.title') }}
        </h1>
        <p class="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-dt-text-muted sm:text-base">
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
              <Icon name="heroicons:lightning-bolt" class="h-5 w-5 text-dt-secondary" />
              <h2 class="text-lg font-semibold text-dt-text">
                {{ t('tools.relativeValue.commonPresets') }}
              </h2>
            </div>
            <div class="grid gap-3 sm:grid-cols-2">
              <button
                v-for="preset in presets"
                :key="`${preset.primarySymbol}-${preset.relativeSymbol}`"
                type="button"
                :data-testid="`preset-${preset.primarySymbol.replace(/[^A-Z0-9]/gi, '_')}-${preset.relativeSymbol.replace(/[^A-Z0-9]/gi, '_')}`"
                class="group flex cursor-pointer items-center gap-4 rounded-2xl border border-dt-border bg-dt-surface p-4 transition-all duration-200 hover:shadow-lg"
                @click="applyPreset(preset)"
              >
                <div class="flex h-12 w-12 items-center justify-center rounded-xl bg-dt-secondary text-white shadow-lg">
                  <Icon name="heroicons:chart-bar" class="h-6 w-6" />
                </div>
                <div class="text-left">
                  <div class="font-semibold text-dt-text">
                    {{ preset.primarySymbol }} / {{ preset.relativeSymbol }}
                  </div>
                  <div class="text-sm text-dt-text-muted">
                    {{ preset.description }}
                  </div>
                </div>
                <Icon name="heroicons:arrow-right" class="ml-auto h-5 w-5 text-dt-text-muted" />
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
          <LedgerCard class="p-6">
            <div class="mb-4 flex items-center gap-2">
              <Icon name="heroicons:table-cells" class="h-5 w-5 text-dt-secondary" />
              <h2 class="text-lg font-semibold text-dt-text">
                {{ t('tools.relativeValue.targetPrices') }}
              </h2>
            </div>

            <div v-if="symbolsMatch" class="mb-4 rounded-2xl border border-dt-warning/40 bg-dt-surface px-4 py-3 text-sm text-dt-text">
              {{ t('tools.relativeValue.sameSymbolWarning') }}
            </div>

            <!-- Tab Buttons -->
            <div class="mb-6 flex rounded-xl border border-dt-border bg-dt-surface p-1">
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
                <label for="target-prices" class="mb-1.5 block text-sm font-medium text-dt-text">
                  {{ t('tools.relativeValue.targetPricesInput') }}
                </label>
                <div class="relative">
                  <textarea
                    id="target-prices"
                    v-model="targetPricesInput"
                    rows="5"
                    :placeholder="t('tools.relativeValue.targetPricesPlaceholder')"
                    class="rv-input w-full rounded-xl border border-dt-border bg-dt-surface px-4 py-3 text-sm font-mono text-dt-text transition-all duration-200 focus:border-dt-primary focus:outline-none"
                  />
                  <button
                    v-if="targetPricesInput"
                    type="button"
                    :aria-label="t('common.clear')"
                    class="absolute right-3 top-3 flex min-h-11 min-w-11 items-center justify-center rounded-lg bg-dt-surface-strong text-dt-text-muted transition-colors"
                    @click="targetPricesInput = ''"
                  >
                    <Icon name="heroicons:x-mark" class="h-4 w-4" />
                  </button>
                </div>
                <p class="mt-2 text-xs text-dt-text-muted">
                  {{ t('tools.relativeValue.targetPricesHint') }}
                </p>
              </div>

              <!-- Auto Generate Content -->
              <div v-if="targetPriceInputMode === 'auto'" class="space-y-4">
                <div class="rounded-xl bg-dt-surface-strong p-4">
                  <div class="flex items-center gap-2 text-sm font-medium text-dt-text">
                    <Icon name="heroicons:sparkles" class="h-4 w-4 text-dt-secondary" />
                    {{ t('tools.relativeValue.autoGeneratePricePoints') }}
                  </div>
                  <p class="mt-1 text-xs text-dt-text-muted">
                    {{ t('tools.relativeValue.basedOnPrimaryPrice', { symbol: primarySymbol || t('tools.relativeValue.primary') }) }}
                  </p>
                </div>

                <div class="grid grid-cols-3 gap-3">
                  <div>
                    <label for="price-count" class="mb-1.5 block text-xs font-medium text-dt-text-muted">
                      {{ t('tools.relativeValue.pricePointCount') }}
                    </label>
                    <input
                      id="price-count"
                      v-model.number="pricePointCount"
                      type="number"
                      min="1"
                      max="20"
                      class="rv-input w-full rounded-lg border border-dt-border bg-dt-surface px-3 py-2 text-center text-sm font-medium text-dt-text transition-all duration-200 focus:border-dt-primary focus:outline-none"
                    >
                  </div>
                  <div>
                    <label for="price-step" class="mb-1.5 block text-xs font-medium text-dt-text-muted">
                      {{ t('tools.relativeValue.pricePointStep') }}
                    </label>
                    <input
                      id="price-step"
                      v-model.number="pricePointStep"
                      type="number"
                      min="1"
                      step="1"
                      class="rv-input w-full rounded-lg border border-dt-border bg-dt-surface px-3 py-2 text-center text-sm font-medium text-dt-text transition-all duration-200 focus:border-dt-primary focus:outline-none"
                    >
                  </div>
                  <div>
                    <label class="mb-1.5 block text-xs font-medium text-dt-text-muted">
                      {{ t('tools.relativeValue.pricePointDirection') }}
                    </label>
                    <div class="flex rounded-lg border border-dt-border bg-dt-surface overflow-hidden">
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
                        class="rv-tab flex-1 border-l border-dt-border px-2 py-2 text-xs font-medium transition-all duration-200"
                        :class="pricePointDirection === 'down' ? 'rv-tab-active' : 'rv-tab-inactive'"
                        @click="pricePointDirection = 'down'"
                      >
                        {{ t('tools.relativeValue.directionDown') }}
                      </button>
                      <button
                        type="button"
                        class="rv-tab flex-1 border-l border-dt-border px-2 py-2 text-xs font-medium transition-all duration-200"
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
                  class="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-dt-border px-4 py-3 text-sm font-medium text-dt-text-muted transition-all duration-200 hover:border-dt-primary hover:bg-dt-surface hover:text-dt-primary"
                  @click="loadExample"
                >
                  <Icon name="heroicons:lightning-bolt" class="h-4 w-4" />
                  {{ t('tools.relativeValue.loadExample') }}: ^GSPC / SPY
                </button>
              </div>
            </div>
          </LedgerCard>
        </div>

        <!-- Right Column: Results -->
        <div class="lg:col-span-5">
          <div class="sticky top-6 space-y-6">
            <!-- Historical Ratio Chart -->
            <LedgerCard
              v-if="primarySymbol.trim() && relativeSymbol.trim()"
            >
              <div class="mb-5 flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:chart-line" class="h-5 w-5 text-dt-secondary" />
                  <h3 class="text-lg font-semibold text-dt-text">
                    {{ t('tools.relativeValue.historicalRatio') }}
                  </h3>
                </div>
                <div class="flex gap-2">
                  <button
                    v-for="rangeOption in ['1mo', '3mo', '6mo', '1y', '5y', 'max']"
                    :key="rangeOption"
                    type="button"
                    class="rounded-full px-3 py-1 text-xs font-medium"
                    :class="historicalRange === rangeOption ? 'bg-dt-primary-solid text-white' : 'bg-dt-surface-strong text-dt-text-muted hover:bg-dt-surface'"
                    @click="historicalRange = rangeOption as '1mo' | '3mo' | '6mo' | '1y' | '5y' | 'max'"
                  >
                    {{ rangeOption.toUpperCase() }}
                  </button>
                </div>
              </div>

              <div v-if="historicalLoading" class="flex h-48 items-center justify-center">
                <Icon name="heroicons:arrow-path" class="h-8 w-8 animate-spin text-dt-secondary" />
              </div>
              <div v-else-if="hasHistoricalRatioData">
                <Line
                  :data="historicalRatioData"
                  :options="chartOptions"
                  class="h-72"
                />
              </div>
              <div v-else class="flex h-48 items-center justify-center text-center text-sm text-dt-text-muted">
                {{ t('tools.relativeValue.noHistoricalData') }}
              </div>
            </LedgerCard>
            <!-- Ratio Display -->
            <LedgerCard v-if="calculationResult">
              <div class="mb-5 flex items-center gap-2">
                <Icon name="heroicons:chart-pie" class="h-5 w-5 text-dt-accent" />
                <h3 class="text-lg font-semibold text-dt-text">
                  {{ t('tools.relativeValue.priceRatio') }}
                </h3>
              </div>

              <div class="space-y-3">
                <!-- Main Ratio -->
                <div class="rounded-2xl border border-dt-border bg-dt-surface p-4 transition-all duration-200 hover:border-dt-border">
                  <div class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">
                    {{ calculationResult.primarySymbol }} / {{ calculationResult.relativeSymbol }}
                  </div>
                  <div class="mt-2 font-mono text-3xl font-bold text-dt-text">
                    {{ formatRatio(calculationResult.ratio) }}
                  </div>
                </div>

                <!-- Inverse Ratio -->
                <div class="rounded-2xl border border-dt-border bg-dt-surface p-4 transition-all duration-200 hover:border-dt-border">
                  <div class="text-xs font-semibold uppercase tracking-wider text-dt-text-muted">
                    {{ calculationResult.relativeSymbol }} / {{ calculationResult.primarySymbol }}
                  </div>
                  <div class="mt-2 font-mono text-3xl font-bold text-dt-text">
                    {{ formatRatio(calculationResult.inverseRatio) }}
                  </div>
                </div>
              </div>

              <!-- Copy Button -->
              <BaseButton variant="secondary" class="mt-5 w-full" @click="copyToClipboard">
                <Icon :name="copySuccess ? 'heroicons:check-circle' : 'heroicons:clipboard-document'" class="h-5 w-5" :class="{ 'text-dt-success': copySuccess }" />
                {{ copySuccess ? t('tools.relativeValue.copied') : t('tools.relativeValue.copyToClipboard') }}
              </BaseButton>
              <BaseButton v-if="researchCapture.canCapture.value" variant="primary" class="mt-2 w-full" @click="openRelativeValueCapture">
                <Icon name="heroicons:pencil-square" class="h-5 w-5" />
                {{ t('researchCapture.captureInsight') }}
              </BaseButton>
            </LedgerCard>

            <!-- Price Table -->
            <LedgerCard v-if="sortedPriceTable.length > 0">
              <div class="flex items-center justify-between border-b border-dt-border pb-3">
                <div class="flex items-center gap-2">
                  <Icon name="heroicons:table" class="h-5 w-5 text-dt-secondary" />
                  <h3 class="text-lg font-semibold text-dt-text">
                    {{ t('tools.relativeValue.priceTable') }}
                  </h3>
                </div>
                <span class="rounded-full bg-dt-primary-solid/10 px-3 py-1 text-xs font-semibold text-dt-primary">
                  {{ sortedPriceTable.length }} points
                </span>
              </div>

              <div class="max-h-[500px] overflow-y-auto">
                <table class="w-full text-sm">
                  <thead class="sticky top-0 bg-dt-surface">
                    <tr class="border-b border-dt-border">
                      <th class="px-6 py-3 text-left font-semibold text-dt-text">
                        {{ calculationResult?.primarySymbol || t('tools.relativeValue.primarySymbol') }}
                      </th>
                      <th class="px-6 py-3 text-right font-semibold text-dt-text">
                        {{ calculationResult?.relativeSymbol || t('tools.relativeValue.relativeSymbol') }}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="row in sortedPriceTable"
                      :key="row.targetPrice"
                      class="group cursor-pointer border-b border-dt-border last:border-0 transition-colors duration-150 hover:bg-dt-surface-strong"
                      :class="{ 'bg-dt-surface-strong': row.targetPrice === primaryPrice }"
                      @click="selectPriceTableRow(row.targetPrice, row.correspondingPrice)"
                    >
                      <td class="font-mono px-6 py-3 font-medium text-dt-text">
                        <button
                          type="button"
                          class="block w-full text-left font-medium focus-visible:outline-2 focus-visible:-outline-offset-2"
                          :aria-label="`${t('tools.relativeValue.targetPrice')}: ${formatPrice(row.targetPrice)} → ${t('tools.relativeValue.currentPrice')}: ${formatPrice(row.correspondingPrice)}`"
                          @click.stop="selectPriceTableRow(row.targetPrice, row.correspondingPrice)"
                        >
                          {{ formatPrice(row.targetPrice) }}
                        </button>
                      </td>
                      <td class="font-mono px-6 py-3 text-right font-medium text-dt-text">
                        {{ formatPrice(row.correspondingPrice) }}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </LedgerCard>

            <!-- Empty State -->
            <LedgerCard v-else class="flex flex-col items-center justify-center p-10 text-center">
              <Icon name="heroicons:chart-bar" class="mb-6 h-20 w-20 text-dt-text-muted" />
              <h3 class="mb-2 text-lg font-semibold text-dt-text">
                {{ t('common.noData') }}
              </h3>
              <p class="max-w-xs text-sm text-dt-text-muted">
                {{ t('tools.relativeValue.emptyState') }}
              </p>
            </LedgerCard>
          </div>
        </div>
      </div>
    </div>
  </div>
  <ResearchCaptureModal :capture="researchCapture" />
</template>

<style scoped>
/* Tab styles */
.rv-tab-active {
  background: var(--color-primary, #3b82f6);
  color: white;
}

.rv-tab-inactive {
  color: var(--color-text-muted, #94a3b8);
}

.rv-tab-inactive:hover {
  color: var(--color-text, #f1f5f9);
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
  background-color: var(--color-text-muted);
}
</style>
