<script setup lang="ts">
import { calculatePositionSizing, validateRatios } from '~/lib/positionSizing'
import { formatCurrency as formatCurrencyUtil, formatNumber as formatNumberUtil } from '~/lib/format'
import { isAuthSessionError } from '~/lib/auth/session-error'
import type { RoundingMode, PositionResult, CalculationSummary } from '~/lib/positionSizing'
import type { VueMessageType } from 'vue-i18n'

const { t, rt, tm } = useI18n()
const toast = useToast()
const router = useRouter()
const { runWithAuthRecovery } = useAuthRecovery()

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
const showSaveToDiaryModal = ref(false)
const savingToDiary = ref(false)

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

const buildDiaryTitle = () => {
  const symbol = stockName.value?.trim()
  return symbol
    ? `${t('tools.positionSizing.diaryTitle')} - ${symbol}`
    : t('tools.positionSizing.diaryTitle')
}

const savePositionSizingToDiary = async (appendToToday: boolean) => {
  const markdown = generateMarkdown()
  if (!markdown || savingToDiary.value) return

  savingToDiary.value = true
  try {
    await runWithAuthRecovery(() => $fetch('/api/diaries', {
      method: 'POST',
      body: {
        title: buildDiaryTitle(),
        content: markdown,
        appendToToday,
        tags: ['position-sizing'],
      },
    }))
    showSaveToDiaryModal.value = false
    toast.success(appendToToday
      ? t('tools.positionSizing.saveToDiary.appendSuccess')
      : t('tools.positionSizing.saveToDiary.createSuccess'))
  } catch (error) {
    if (isAuthSessionError(error)) {
      showSaveToDiaryModal.value = false
      toast.error(t('tools.positionSizing.saveToDiary.loginRequired'))
      await router.push('/auth/login')
      return
    }

    toast.error(t('tools.positionSizing.saveToDiary.failed'))
  } finally {
    savingToDiary.value = false
  }
}

const copyOnlyFromDiaryModal = async () => {
  await copyToClipboard()
  showSaveToDiaryModal.value = false
}

const createTradePlanFromPositionSizing = async () => {
  const markdown = generateMarkdown()
  if (!markdown || !summary.value) return

  const prefill = {
    symbol: stockName.value?.trim().toUpperCase() || '',
    entryPrice: stockPrice.value ? String(stockPrice.value) : '',
    maxPositionSize: summary.value.totalInvested ? String(summary.value.totalInvested.toFixed(2)) : '',
    notes: markdown,
    status: 'draft',
  }

  if (process.client) {
    sessionStorage.setItem('tradePlanPrefill', JSON.stringify(prefill))
  }

  await router.push('/trade-plans/new?prefill=position-sizing')
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
  <div class="min-h-screen bg-dt-bg font-body">
    <section class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="rounded-xl border border-dt-border bg-dt-surface shadow-dt-sm overflow-hidden p-6 sm:p-8">
        <div class="grid gap-8 lg:grid-cols-[1.2fr_0.9fr] lg:items-center">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-3">{{ t('tools.positionSizing.heroKicker') }}</p>
            <h1 class="font-display text-3xl font-semibold tracking-tight text-dt-text sm:text-4xl">
              {{ t('tools.positionSizing.title') }}
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-dt-text-muted sm:text-base">
              {{ t('tools.positionSizing.subtitle') }}
            </p>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface p-4">
                <span class="block text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.strategy') }}</span>
                <span class="mt-2 block font-data text-xl font-semibold text-dt-text leading-tight break-words">{{ selectedStrategy.name }}</span>
              </div>
              <div class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface p-4">
                <span class="block text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.investCapital') }}</span>
                <span class="mt-2 block font-data text-xl font-semibold text-dt-text leading-tight break-words">{{ effectiveCapital ? formatCurrency(effectiveCapital) : '—' }}</span>
              </div>
              <div class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface p-4">
                <span class="block text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.stockPrice') }}</span>
                <span class="mt-2 block font-data text-xl font-semibold text-dt-text leading-tight break-words">{{ stockPrice ? `$${stockPrice}` : '—' }}</span>
              </div>
            </div>
          </div>

          <div class="rounded-xl border border-dt-primary/30 bg-dt-surface p-6">
            <div class="text-xs font-bold uppercase tracking-[0.16em] text-dt-text-muted">{{ t('tools.positionSizing.capitalInputMode') }}</div>
            <div class="mt-2 break-words font-data text-2xl font-semibold leading-tight text-dt-text">
              {{ usePercentageMode ? t('tools.positionSizing.switchToDirect') : t('tools.positionSizing.switchToPercentage') }}
            </div>
            <p class="mt-3 text-sm leading-6 text-dt-text-muted">
              {{ selectedStrategy.description }}
            </p>

            <div class="mt-6 space-y-3">
              <div class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface-muted px-4 py-3">
                <span class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.reserveCash') }}</span>
                <span class="ml-auto block mt-1 font-data text-lg font-semibold text-dt-text">{{ reserveCashPercent }}%</span>
              </div>
              <div class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface-muted px-4 py-3">
                <span class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.roundingMode') }}</span>
                <span class="ml-auto block mt-1 font-data text-lg font-semibold text-dt-text">{{ t(`tools.positionSizing.${roundingMode === 'down' ? 'roundDown' : roundingMode === 'nearest' ? 'roundNearest' : 'roundUp'}`) }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
      <div class="space-y-6">
        <div class="rounded-xl border border-dt-border bg-dt-surface shadow-dt-sm p-6 sm:p-7">
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-2">{{ t('tools.positionSizing.inputParams') }}</p>
              <h2 class="font-display text-xl font-semibold text-dt-text">
                {{ t('tools.positionSizing.inputParams') }}
              </h2>
            </div>
            <BaseButton variant="secondary" class="w-full sm:w-auto" @click="usePercentageMode = !usePercentageMode">
              {{ usePercentageMode ? t('tools.positionSizing.switchToDirect') : t('tools.positionSizing.switchToPercentage') }}
            </BaseButton>
          </div>

          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">
                {{ t('tools.positionSizing.stockName') }}
                <span class="text-dt-text-muted">({{ t('common.optional') }})</span>
              </label>
              <div class="relative mt-2">
                <input v-model="stockName" type="text" :placeholder="t('tools.positionSizing.stockNamePlaceholder')" class="field-input">
              </div>
            </div>

            <div>
              <label class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.stockPrice') }}</label>
              <div class="relative mt-2">
                <input v-model.number="stockPrice" type="number" min="0" step="0.5" :placeholder="t('tools.positionSizing.stockPricePlaceholder')" class="field-input">
                <span class="field-unit">$</span>
              </div>
            </div>
          </div>

          <div class="subpanel mt-6">
            <div v-if="usePercentageMode" class="grid gap-5 md:grid-cols-2">
              <div>
                <label class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.baseCapital') }}</label>
                <div class="relative mt-2">
                  <input v-model.number="baseCapital" type="number" min="0" step="10000" :placeholder="t('tools.positionSizing.baseCapitalPlaceholder')" class="field-input">
                  <span class="field-unit">$</span>
                </div>
              </div>

              <div>
                <label class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.capitalPercent') }}</label>
                <div class="relative mt-2">
                  <input v-model.number="capitalPercent" type="number" min="0" max="100" step="1" :placeholder="t('tools.positionSizing.capitalPercentPlaceholder')" class="field-input">
                  <span class="field-unit">%</span>
                </div>
              </div>
            </div>

            <div v-else>
              <label class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.investCapital') }}</label>
              <div class="relative mt-2">
                <input v-model.number="totalCapital" type="number" min="0" step="10000" :placeholder="t('tools.positionSizing.totalCapitalPlaceholder')" class="field-input">
                <span class="field-unit">$</span>
              </div>
            </div>

            <div v-if="usePercentageMode && effectiveCapital" class="flex items-center justify-between gap-3 rounded-xl border border-dt-border bg-dt-surface-muted p-4 mt-5 sm:flex-row sm:gap-4">
              <span class="text-xs font-bold uppercase tracking-[0.08em] text-dt-secondary">{{ t('tools.positionSizing.calculatedCapital') }}</span>
              <span class="font-data text-lg font-semibold text-dt-text">{{ formatCurrency(effectiveCapital) }}</span>
            </div>
          </div>

          <div class="mt-6 grid gap-5 md:grid-cols-2">
            <div>
              <label class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.reserveCash') }}</label>
              <div class="subpanel mt-2">
                <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <input v-model.number="reserveCashPercent" type="range" min="0" max="20" step="1" class="w-full cursor-pointer accent-dt-primary">
                  <span class="font-data text-sm font-semibold text-dt-text sm:min-w-12 sm:text-right">{{ reserveCashPercent }}%</span>
                </div>
                <p class="mt-2 text-xs text-dt-text-soft">{{ t('tools.positionSizing.reserveCashHint') }}</p>
              </div>
            </div>

            <div>
              <label class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.roundingMode') }}</label>
              <div class="mt-2 grid gap-2 sm:grid-cols-2">
                <button
                  v-for="mode in (['down', 'nearest', 'up'] as const)"
                  :key="mode"
                  type="button"
                  class="choice-card cursor-pointer text-center text-sm leading-snug break-words"
                  :class="roundingMode === mode ? 'choice-card-active' : ''"
                  @click="roundingMode = mode"
                >
                  {{ t(`tools.positionSizing.${mode === 'down' ? 'roundDown' : mode === 'nearest' ? 'roundNearest' : 'roundUp'}`) }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isValidInput && summary" class="rounded-xl border border-dt-border bg-dt-surface shadow-dt-sm overflow-hidden">
          <div class="bg-dt-primary p-6 sm:p-7">
            <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-white/70">
                  {{ t('tools.positionSizing.totalInvested') }}
                </p>
                <div class="mt-2 text-4xl font-semibold tracking-tight text-white">
                  {{ formatCurrency(summary.totalInvested) }}
                </div>
              </div>
              <BaseButton variant="secondary" class="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20 w-full sm:w-auto" @click="copyToClipboard">
                <Icon :name="copySuccess ? 'heroicons:check' : 'heroicons:clipboard-document'" class="mr-2 h-4 w-4" />
                {{ copySuccess ? t('tools.positionSizing.copied') : t('tools.positionSizing.copyToClipboard') }}
              </BaseButton>
              <BaseButton variant="secondary" class="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20 w-full sm:w-auto" @click="showSaveToDiaryModal = true">
                <Icon name="heroicons:document-plus" class="mr-2 h-4 w-4" />
                {{ t('tools.positionSizing.saveToDiary.button') }}
              </BaseButton>
              <BaseButton variant="secondary" class="!border-white/30 !bg-white/10 !text-white hover:!bg-white/20 w-full sm:w-auto" @click="createTradePlanFromPositionSizing">
                <Icon name="heroicons:clipboard-document-list" class="mr-2 h-4 w-4" />
                {{ t('tools.positionSizing.createTradePlan') }}
              </BaseButton>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="min-w-0 rounded-dt-sm border border-white/10 bg-white/5 px-4 py-3">
                <span class="text-xs font-bold uppercase tracking-[0.08em] text-white/60">{{ t('tools.positionSizing.totalShares') }}</span>
                <span class="mt-2 block font-data text-lg font-semibold text-white">{{ formatNumber(summary.totalShares) }}</span>
              </div>
              <div class="min-w-0 rounded-dt-sm border border-white/10 bg-white/5 px-4 py-3">
                <span class="text-xs font-bold uppercase tracking-[0.08em] text-white/60">{{ t('tools.positionSizing.avgPrice') }}</span>
                <span class="mt-2 block font-data text-lg font-semibold text-white">{{ summary.avgPrice.toFixed(2) }}</span>
              </div>
              <div class="min-w-0 rounded-dt-sm border border-white/10 bg-white/5 px-4 py-3">
                <span class="text-xs font-bold uppercase tracking-[0.08em] text-white/60">{{ t('tools.positionSizing.utilizationRate') }}</span>
                <span class="mt-2 block font-data text-lg font-semibold text-white">{{ summary.utilizationRate.toFixed(1) }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div class="rounded-xl border border-dt-border bg-dt-surface shadow-dt-sm p-6 sm:p-7">
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-2">{{ t('tools.positionSizing.strategy') }}</p>
              <h3 class="font-display text-xl font-semibold text-dt-text">
                {{ t('tools.positionSizing.strategy') }}
              </h3>
            </div>
            <StatusBadge v-if="!ratiosValidation.isValid" tone="warning">
              {{ ratiosValidation.sum.toFixed(1) }}%
            </StatusBadge>
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
              <div class="text-sm font-semibold text-dt-text">{{ strategy.name }}</div>
              <div class="mt-2 text-xs uppercase tracking-[0.14em] text-dt-text-muted">
                {{ strategy.ratios.join(' / ') }}
              </div>
            </button>
          </div>

          <div class="subpanel mt-5">
            <div class="text-sm font-semibold text-dt-text">{{ selectedStrategy.name }}</div>
            <p class="mt-2 text-sm leading-6 text-dt-text-muted">
              {{ selectedStrategy.description }}
            </p>

            <div class="mt-5 grid gap-4 sm:grid-cols-2">
              <div>
                <div class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.markdown.pros') }}</div>
                <ul class="mt-3 space-y-2">
                  <li v-for="pro in selectedStrategy.pros" :key="pro" class="flex items-start gap-2.5">
                    <Icon name="heroicons:check-circle" class="h-4 w-4 shrink-0 text-emerald-500" />
                    <span>{{ pro }}</span>
                  </li>
                </ul>
              </div>
              <div>
                <div class="text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.markdown.cons') }}</div>
                <ul class="mt-3 space-y-2">
                  <li v-for="con in selectedStrategy.cons" :key="con" class="flex items-start gap-2.5">
                    <Icon name="heroicons:minus-circle" class="h-4 w-4 shrink-0 text-dt-warning" />
                    <span>{{ con }}</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <div v-if="summary && (summary.reservedCash > 0 || summary.unallocatedCash > 0)" class="rounded-xl border border-dt-border bg-dt-surface shadow-dt-sm p-6 sm:p-7">
          <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-2">{{ t('tools.positionSizing.cashBufferTitle') }}</p>
          <h3 class="font-display text-xl font-semibold text-dt-text">{{ t('tools.positionSizing.cashBufferTitle') }}</h3>
          <div class="mt-5 grid gap-3">
            <div v-if="summary.reservedCash > 0" class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface p-4">
              <span class="block text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.markdown.strategicReserve') }}</span>
              <span class="mt-2 block font-data text-xl font-semibold text-dt-text leading-tight break-words">{{ formatCurrency(summary.reservedCash) }}</span>
            </div>
            <div v-if="summary.unallocatedCash > 0" class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface p-4">
              <span class="block text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.markdown.technicalRemainder') }}</span>
              <span class="mt-2 block font-data text-xl font-semibold text-dt-text leading-tight break-words">{{ formatCurrency(summary.unallocatedCash) }}</span>
            </div>
            <div class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface p-4">
              <span class="block text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.markdown.totalRemainingCash') }}</span>
              <span class="mt-2 block font-data text-xl font-semibold text-dt-text leading-tight break-words">{{ formatCurrency(summary.totalRemainingCash) }}</span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section v-if="isValidInput && calculationResults.length" class="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div class="rounded-xl border border-dt-border bg-dt-surface shadow-dt-sm p-6 sm:p-7">
        <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-2">{{ t('tools.positionSizing.detailTable') }}</p>
            <h3 class="font-display text-xl font-semibold text-dt-text">
              {{ t('tools.positionSizing.detailTable') }}
            </h3>
          </div>
          <div class="text-xs uppercase tracking-[0.16em] text-dt-text-muted">
            {{ calculationResults.length }} {{ t('tools.positionSizing.batches') }}
          </div>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div v-for="(result, index) in calculationResults" :key="index" class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface p-4">
            <div class="flex items-start justify-between gap-4">
              <div>
                <div class="text-sm font-semibold text-dt-text">
                  {{ t('tools.positionSizing.table.batchN', { n: index + 1 }) }}
                </div>
                <div class="mt-1 text-xs uppercase tracking-[0.14em] text-dt-text-muted">
                  {{ result.ratio }}%
                </div>
              </div>
              <span class="rounded-full bg-dt-primary/10 px-3 py-1 text-sm font-semibold text-dt-primary">
                {{ formatNumber(result.shares) }} {{ t('tools.positionSizing.shares') || '股' }}
              </span>
            </div>

            <div class="mt-5 grid gap-3 sm:grid-cols-3">
              <div class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface-muted px-3 py-2">
                <span class="block text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.table.plannedAmount') }}</span>
                <span class="mt-1 block font-data text-base font-semibold text-dt-text leading-tight break-words">{{ formatCurrency(result.amount) }}</span>
              </div>
              <div class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface-muted px-3 py-2">
                <span class="block text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.table.actualAmount') }}</span>
                <span class="mt-1 block font-data text-base font-semibold text-dt-text leading-tight break-words">{{ formatCurrency(result.actualAmount) }}</span>
              </div>
              <div class="min-w-0 rounded-dt-sm border border-dt-border bg-dt-surface-muted px-3 py-2">
                <span class="block text-xs font-bold uppercase tracking-[0.08em] text-dt-text-soft">{{ t('tools.positionSizing.table.cumulativeShares') }}</span>
                <span class="mt-1 block font-data text-base font-semibold text-dt-text leading-tight break-words">{{ formatNumber(result.cumulativeShares) }}</span>
              </div>
            </div>
          </div>
        </div>

        <div v-if="warnings.length > 0 || (summary && summary.isOverBudget)" class="mt-6 space-y-3">
          <div v-for="(warning, index) in warnings" :key="index" class="flex items-start gap-2.5 rounded-dt-sm border border-dt-warning/30 bg-dt-warning/10 px-4 py-3">
            <Icon name="heroicons:exclamation-triangle" class="h-5 w-5 shrink-0 text-dt-warning" />
            <span class="text-sm text-dt-warning">{{ warning }}</span>
          </div>
          <div v-if="summary && summary.isOverBudget" class="flex items-start gap-2.5 rounded-dt-sm border border-dt-danger/30 bg-dt-danger/10 px-4 py-3">
            <Icon name="heroicons:exclamation-circle" class="h-5 w-5 shrink-0 text-dt-danger" />
            <span class="text-sm text-dt-danger">
              {{ t('tools.positionSizing.overBudgetWarning', { amount: formatCurrency(summary.overBudgetAmount) }) }}
            </span>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8">
      <div class="rounded-xl border border-dt-border bg-dt-surface shadow-dt-sm p-10 text-center">
        <Icon name="heroicons:calculator" class="mx-auto h-14 w-14 text-dt-text-muted" />
        <p class="mt-4 text-sm text-dt-text-muted">
          {{ t('tools.positionSizing.emptyState') }}
        </p>
      </div>
    </section>

    <div v-if="showSaveToDiaryModal" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div class="w-full max-w-lg rounded-xl border border-dt-border bg-dt-surface p-6 shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.16em] text-dt-secondary">
              {{ t('tools.positionSizing.saveToDiary.kicker') }}
            </p>
            <h2 class="mt-1 font-display text-2xl tracking-tight text-dt-text">
              {{ t('tools.positionSizing.saveToDiary.title') }}
            </h2>
            <p class="mt-2 text-sm leading-6 text-dt-text-muted">
              {{ t('tools.positionSizing.saveToDiary.description') }}
            </p>
          </div>
          <button class="rounded-md p-1 text-dt-text-muted hover:text-dt-text" type="button" @click="showSaveToDiaryModal = false">
            <Icon name="heroicons:x-mark" class="h-5 w-5" />
          </button>
        </div>

        <div class="mt-6 grid gap-3">
          <BaseButton :disabled="savingToDiary" @click="savePositionSizingToDiary(true)">
            <Icon v-if="savingToDiary" name="svg-spinners:180-ring-with-bg" class="mr-2 h-4 w-4" />
            {{ t('tools.positionSizing.saveToDiary.appendToday') }}
          </BaseButton>
          <BaseButton variant="secondary" :disabled="savingToDiary" @click="savePositionSizingToDiary(false)">
            {{ t('tools.positionSizing.saveToDiary.createNew') }}
          </BaseButton>
          <BaseButton variant="ghost" :disabled="savingToDiary" @click="copyOnlyFromDiaryModal">
            {{ t('tools.positionSizing.saveToDiary.copyOnly') }}
          </BaseButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Minimal scoped styles — field input styling requires scoped selectors */
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

.subpanel {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  padding: 1rem;
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
  transition: border-color 180ms ease, background-color 180ms ease;
}

.choice-card-active {
  border-color: var(--color-secondary);
  background: color-mix(in srgb, var(--color-secondary) 8%, var(--color-surface));
}
</style>
