<script setup lang="ts">
import {
  calculateFinancialFreedom,
  withdrawalRatePresets,
  formatCurrency,
  formatPercent,
  formatDate
} from '~/lib/financialFreedom'
import type { WithdrawalRatePreset } from '~/lib/financialFreedom'

const { t, locale } = useI18n()
const toast = useToast()

const annualExpenses = ref<number | null>(600000)
const currentAssets = ref<number | null>(1000000)
const monthlyContribution = ref<number | null>(20000)
const expectedReturn = ref<number>(8)
const withdrawalRatePreset = ref<WithdrawalRatePreset>('moderate')
const customWithdrawalRate = ref<number>(4)
const inflationRate = ref<number>(2)

const returnRateLevel = computed(() => {
  const rate = expectedReturn.value
  if (rate <= 4) return 'conservative'
  if (rate <= 10) return 'target'
  return 'expert'
})

const returnRateIndicator = computed(() => {
  const levels = ['conservative', 'target', 'expert'] as const
  const currentIndex = levels.indexOf(returnRateLevel.value)

  return levels.map((level, index) => {
    const isActive = index === currentIndex
    const isPast = index < currentIndex

    let colorClass = ''
    if (isActive) {
      colorClass = level === 'conservative' ? 'bg-gray-500' : level === 'target' ? 'bg-green-500' : 'bg-violet-500'
    } else if (isPast) {
      colorClass = level === 'conservative' ? 'bg-gray-400' : 'bg-green-400'
    } else {
      colorClass = 'bg-gray-200 dark:bg-gray-700'
    }

    return { level, colorClass }
  })
})

const withdrawalRate = computed(() => {
  const preset = withdrawalRatePresets.find(p => p.id === withdrawalRatePreset.value)
  return preset?.rate ?? customWithdrawalRate.value
})

const isValidInput = computed(() =>
  annualExpenses.value !== null &&
  annualExpenses.value > 0 &&
  currentAssets.value !== null &&
  currentAssets.value >= 0 &&
  monthlyContribution.value !== null &&
  monthlyContribution.value >= 0
)

const result = computed(() => {
  if (!isValidInput.value) return null

  return calculateFinancialFreedom({
    annualExpenses: annualExpenses.value!,
    currentAssets: currentAssets.value!,
    monthlyContribution: monthlyContribution.value!,
    expectedReturn: expectedReturn.value,
    withdrawalRate: withdrawalRate.value,
    inflationRate: inflationRate.value,
    yearsToRetirement: null
  })
})

const progressColor = computed(() => {
  const progress = result.value?.currentProgress ?? 0
  if (progress >= 75) return 'bg-green-500'
  if (progress >= 50) return 'bg-blue-500'
  if (progress >= 25) return 'bg-amber-500'
  return 'bg-gray-400'
})

const localizedRecommendation = computed(() => {
  if (!result.value) return ''

  const progress = result.value.currentProgress
  const wr = withdrawalRate.value
  const lines: string[] = []

  if (progress >= 100) {
    lines.push(t('tools.financialFreedom.recommendations.progress.alreadyFree'))
  } else if (progress >= 75) {
    lines.push(t('tools.financialFreedom.recommendations.progress.veryClose'))
  } else if (progress >= 50) {
    lines.push(t('tools.financialFreedom.recommendations.progress.halfway'))
  } else if (progress >= 25) {
    lines.push(t('tools.financialFreedom.recommendations.progress.goodStart'))
  } else {
    lines.push(t('tools.financialFreedom.recommendations.progress.justStarted'))
  }

  if (wr <= 3) {
    lines.push(t('tools.financialFreedom.recommendations.withdrawal.conservative'))
  } else if (wr >= 5) {
    lines.push(t('tools.financialFreedom.recommendations.withdrawal.aggressive'))
  }

  return lines.join('\n\n')
})

const getPresetName = (preset: typeof withdrawalRatePresets[0]) => {
  return t(`tools.financialFreedom.withdrawalPresets.${preset.id}.name`)
}

const formatCurrencyLocal = (value: number) => formatCurrency(value, locale.value)

const copySuccess = ref(false)

const copyToClipboard = async () => {
  if (!result.value) return

  const lines: string[] = []
  const isEnglish = locale.value === 'en'
  const isTraditional = locale.value === 'zh-TW'

  lines.push(isEnglish ? '# Financial Freedom Analysis' : (isTraditional ? '# 財務自由分析' : '# 财务自由分析'))
  lines.push('')
  lines.push(isEnglish ? '## Input Parameters' : (isTraditional ? '## 輸入參數' : '## 输入参数'))
  lines.push('')
  lines.push(`| ${isEnglish ? 'Parameter' : '參數'} | ${isEnglish ? 'Value' : '數值'} |`)
  lines.push('|------|------|')
  lines.push(`| ${isEnglish ? 'Annual Expenses' : '年度支出'} | ${formatCurrencyLocal(annualExpenses.value!)} |`)
  lines.push(`| ${isEnglish ? 'Current Assets' : '目前資產'} | ${formatCurrencyLocal(currentAssets.value!)} |`)
  lines.push(`| ${isEnglish ? 'Monthly Contribution' : '每月投入'} | ${formatCurrencyLocal(monthlyContribution.value!)} |`)
  lines.push(`| ${isEnglish ? 'Expected Return' : '預期報酬率'} | ${expectedReturn.value}% |`)
  lines.push(`| ${isEnglish ? 'Withdrawal Rate' : '提領率'} | ${withdrawalRate.value}% |`)
  lines.push('')
  lines.push(isEnglish ? '## Financial Target' : (isTraditional ? '## 財務目標' : '## 财务目标'))
  lines.push('')
  lines.push(`- **${isEnglish ? 'FIRE Number' : '財務自由金額'}**: ${formatCurrencyLocal(result.value.fireNumber)}`)
  lines.push(`- **${isEnglish ? 'Progress' : '完成進度'}**: ${result.value.currentProgress.toFixed(1)}%`)
  lines.push(`- **${isEnglish ? 'Amount Needed' : '還需要'}**: ${formatCurrencyLocal(result.value.amountNeeded)}`)
  lines.push('')
  lines.push(isEnglish ? '## Time to Freedom' : (isTraditional ? '## 距離財務自由' : '## 距离财务自由'))
  lines.push('')
  if (result.value.yearsToFreedom === 0) {
    lines.push(`- 🎉 **${isEnglish ? 'Congratulations! You are financially free!' : '恭喜！您已達成財務自由！'}**`)
  } else if (result.value.yearsToFreedom !== null) {
    lines.push(`- **${isEnglish ? 'Years to Freedom' : '所需年數'}**: ${result.value.yearsToFreedom.toFixed(1)} ${isEnglish ? 'years' : '年'}`)
    lines.push(`- **${isEnglish ? 'Target Date' : '預計達成'}**: ${formatDate(result.value.freedomDate!, locale.value)}`)
  }
  lines.push('')
  lines.push(isEnglish ? '## Withdrawal Capacity (After Freedom)' : (isTraditional ? '## 達成後可提領金額' : '## 达成后可提领金额'))
  lines.push('')
  lines.push(`- **${isEnglish ? 'Monthly' : '每月'}**: ${formatCurrencyLocal(result.value.monthlyWithdrawal)}`)
  lines.push(`- **${isEnglish ? 'Weekly' : '每週'}**: ${formatCurrencyLocal(result.value.weeklyWithdrawal)}`)
  lines.push(`- **${isEnglish ? 'Daily' : '每日'}**: ${formatCurrencyLocal(result.value.dailyWithdrawal)}`)
  lines.push('')
  lines.push(isEnglish ? '## Yearly Projection (First 10 Years)' : (isTraditional ? '## 年度成長預測（前10年）' : '## 年度成长预测（前10年）'))
  lines.push('')
  lines.push(`| ${isEnglish ? 'Year' : '年份'} | ${isEnglish ? 'Starting' : '期初'} | ${isEnglish ? 'Contribution' : '投入'} | ${isEnglish ? 'Returns' : '報酬'} | ${isEnglish ? 'Ending' : '期末'} |`)
  lines.push('|------|----------|----------|----------|----------|')

  for (const year of result.value.yearlyProjection.slice(0, 10)) {
    const yearLabel = isEnglish ? `Year ${year.year}` : `第 ${year.year} 年`
    const freedTag = year.isFreed ? ' ✅' : ''
    lines.push(`| ${yearLabel}${freedTag} | ${formatCurrencyLocal(year.startingAssets)} | +${formatCurrencyLocal(year.contribution)} | ${year.returns >= 0 ? '+' : ''}${formatCurrencyLocal(year.returns)} | ${formatCurrencyLocal(year.endingAssets)} |`)
  }

  lines.push('')
  lines.push('---')
  lines.push(`*${isEnglish ? 'Generated by Financial Freedom Calculator' : '由財務自由計算機產生'}*`)

  try {
    await navigator.clipboard.writeText(lines.join('\n'))
    copySuccess.value = true
    toast.success(t('tools.financialFreedom.copySuccess'))
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch {
    toast.error(t('tools.financialFreedom.copyFailed'))
  }
}

useHead({
  title: '財務自由計算機 - 投資工具',
  meta: [
    { name: 'description', content: '計算您的財務自由金額（FIRE Number），了解目前進度與達成時間。支援多種提領率設定，幫助您規劃財務自由之路。' }
  ]
})

definePageMeta({
  requiresAuth: false
})
</script>

<template>
  <div class="freedom-page min-h-screen">
    <section class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div class="panel overflow-hidden p-6 sm:p-8">
        <div class="grid gap-8 lg:grid-cols-[1.25fr_0.9fr] lg:items-center">
          <div>
            <p class="kicker mb-3">FIRE Planning Console</p>
            <h1 class="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100 sm:text-4xl">
              {{ t('tools.financialFreedom.title') }}
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300 sm:text-base">
              {{ t('tools.financialFreedom.subtitle') }}
            </p>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="metric-card">
                <div class="metric-label">{{ t('tools.financialFreedom.fireNumber') }}</div>
                <div class="metric-value">
                  {{ result ? formatCurrencyLocal(result.fireNumber) : '—' }}
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">{{ t('tools.financialFreedom.amountNeeded') }}</div>
                <div class="metric-value">
                  {{ result ? formatCurrencyLocal(result.amountNeeded) : '—' }}
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">{{ t('tools.financialFreedom.yearsToFreedom') }}</div>
                <div class="metric-value">
                  <template v-if="result?.yearsToFreedom === 0">
                    {{ t('tools.financialFreedom.alreadyFree') }}
                  </template>
                  <template v-else-if="result?.yearsToFreedom !== null && result?.yearsToFreedom !== undefined">
                    {{ result.yearsToFreedom.toFixed(1) }}
                  </template>
                  <template v-else>
                    —
                  </template>
                </div>
              </div>
            </div>
          </div>

          <div class="hero-spotlight">
            <div class="hero-spotlight-label">{{ t('tools.financialFreedom.withdrawalRate') }}</div>
            <div class="hero-spotlight-value">{{ formatPercent(withdrawalRate) }}</div>
            <p class="text-sm leading-6 text-slate-300">
              {{ t(`tools.financialFreedom.withdrawalPresets.${withdrawalRatePreset}.description`) }}
            </p>

            <div class="mt-5">
              <div class="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-slate-400">
                <span>{{ t('tools.financialFreedom.expectedReturn') }}</span>
                <span>{{ expectedReturn }}%</span>
              </div>
              <div class="flex items-center gap-2">
                <template v-for="(indicator, index) in returnRateIndicator" :key="indicator.level">
                  <div class="h-2.5 flex-1 rounded-full transition-all duration-300" :class="indicator.colorClass" />
                  <span v-if="index < returnRateIndicator.length - 1" class="text-[10px] text-slate-500">•</span>
                </template>
              </div>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <div class="spotlight-stat">
                <span class="spotlight-stat-label">{{ t('tools.financialFreedom.monthlyContribution') }}</span>
                <span class="spotlight-stat-value">{{ monthlyContribution ? formatCurrencyLocal(monthlyContribution) : '—' }}</span>
              </div>
              <div class="spotlight-stat">
                <span class="spotlight-stat-label">{{ t('tools.financialFreedom.currentAssets') }}</span>
                <span class="spotlight-stat-value">{{ currentAssets !== null ? formatCurrencyLocal(currentAssets) : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
      <div class="space-y-6">
        <div class="panel p-6 sm:p-7">
          <div class="mb-6 flex items-start justify-between gap-4">
            <div>
              <p class="kicker mb-2">{{ t('tools.financialFreedom.inputParams') }}</p>
              <h2 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {{ t('tools.financialFreedom.inputParams') }}
              </h2>
            </div>
            <div class="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-blue-700 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-300">
              {{ t(`tools.financialFreedom.returnRateLevels.${returnRateLevel}.label`) }}
            </div>
          </div>

          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label class="field-label">{{ t('tools.financialFreedom.annualExpenses') }}</label>
              <div class="field-shell">
                <input v-model.number="annualExpenses" type="number" min="0" step="10000" :placeholder="t('tools.financialFreedom.annualExpensesPlaceholder')" class="field-input">
                <span class="field-unit">$/年</span>
              </div>
              <p class="field-hint">{{ t('tools.financialFreedom.annualExpensesHint') }}</p>
            </div>

            <div>
              <label class="field-label">{{ t('tools.financialFreedom.currentAssets') }}</label>
              <div class="field-shell">
                <input v-model.number="currentAssets" type="number" min="0" step="100000" :placeholder="t('tools.financialFreedom.currentAssetsPlaceholder')" class="field-input">
                <span class="field-unit">$</span>
              </div>
            </div>

            <div>
              <label class="field-label">{{ t('tools.financialFreedom.monthlyContribution') }}</label>
              <div class="field-shell">
                <input v-model.number="monthlyContribution" type="number" min="0" step="5000" :placeholder="t('tools.financialFreedom.monthlyContributionPlaceholder')" class="field-input">
                <span class="field-unit">$/月</span>
              </div>
            </div>

            <div>
              <label class="field-label">{{ t('tools.financialFreedom.expectedReturn') }}</label>
              <div class="field-shell">
                <input v-model.number="expectedReturn" type="number" min="0" max="30" step="0.5" class="field-input">
                <span class="field-unit">%</span>
              </div>
              <p class="field-hint">{{ t('tools.financialFreedom.expectedReturnHint') }}</p>
            </div>
          </div>

          <div class="subpanel mt-6">
            <div class="mb-4 flex items-center justify-between gap-4">
              <h3 class="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-300">
                {{ t('tools.financialFreedom.expectedReturn') }} {{ t('common.range') }}
              </h3>
              <span class="text-sm font-semibold text-slate-900 dark:text-slate-100">{{ expectedReturn }}%</span>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <div class="range-card" :class="returnRateLevel === 'conservative' ? 'range-card-active-slate' : ''">
                <div class="mb-2 flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-full bg-slate-500" />
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {{ t('tools.financialFreedom.returnRateLevels.conservative.label') }}
                  </span>
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400">
                  {{ t('tools.financialFreedom.returnRateLevels.conservative.range') }}
                </div>
                <p class="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {{ t('tools.financialFreedom.returnRateLevels.conservative.description') }}
                </p>
              </div>

              <div class="range-card" :class="returnRateLevel === 'target' ? 'range-card-active-green' : ''">
                <div class="mb-2 flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {{ t('tools.financialFreedom.returnRateLevels.target.label') }}
                  </span>
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400">
                  {{ t('tools.financialFreedom.returnRateLevels.target.range') }}
                </div>
                <p class="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {{ t('tools.financialFreedom.returnRateLevels.target.description') }}
                </p>
              </div>

              <div class="range-card" :class="returnRateLevel === 'expert' ? 'range-card-active-violet' : ''">
                <div class="mb-2 flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  <span class="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    {{ t('tools.financialFreedom.returnRateLevels.expert.label') }}
                  </span>
                </div>
                <div class="text-xs text-slate-500 dark:text-slate-400">
                  {{ t('tools.financialFreedom.returnRateLevels.expert.range') }}
                </div>
                <p class="mt-2 text-xs leading-5 text-slate-600 dark:text-slate-300">
                  {{ t('tools.financialFreedom.returnRateLevels.expert.description') }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-6">
            <label class="field-label">{{ t('tools.financialFreedom.withdrawalRate') }}</label>
            <div class="grid gap-3 sm:grid-cols-3">
              <button
                v-for="preset in withdrawalRatePresets"
                :key="preset.id"
                type="button"
                class="choice-card cursor-pointer"
                :class="withdrawalRatePreset === preset.id ? 'choice-card-active' : ''"
                @click="withdrawalRatePreset = preset.id"
              >
                <div class="text-sm font-semibold">{{ getPresetName(preset) }}</div>
                <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">{{ preset.rate }}%</div>
              </button>
            </div>
          </div>
        </div>

        <div v-if="isValidInput && result" class="panel overflow-hidden">
          <div class="result-banner p-6 sm:p-7">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-sky-100/80">
                  {{ t('tools.financialFreedom.fireNumber') }}
                </p>
                <div class="mt-2 text-4xl font-semibold tracking-tight text-white">
                  {{ formatCurrencyLocal(result.fireNumber) }}
                </div>
              </div>
              <button type="button" class="action-btn cursor-pointer" @click="copyToClipboard">
                <Icon :name="copySuccess ? 'heroicons:check' : 'heroicons:clipboard-document'" class="mr-2 h-4 w-4" />
                {{ copySuccess ? t('tools.financialFreedom.copied') : t('tools.financialFreedom.copyToClipboard') }}
              </button>
            </div>

            <div class="mt-6">
              <div class="mb-2 flex items-center justify-between text-sm text-sky-100/90">
                <span>{{ t('tools.financialFreedom.progress', { percent: result.currentProgress.toFixed(1) }) }}</span>
                <span>{{ result.currentProgress.toFixed(1) }}%</span>
              </div>
              <div class="h-3 overflow-hidden rounded-full bg-white/15">
                <div class="h-full rounded-full transition-all duration-500" :class="progressColor" :style="{ width: `${Math.min(100, result.currentProgress)}%` }" />
              </div>
            </div>
          </div>

          <div class="grid gap-4 border-t border-slate-200/70 p-6 dark:border-slate-800 sm:grid-cols-3 sm:p-7">
            <div class="summary-card">
              <div class="summary-label">{{ t('tools.financialFreedom.amountNeeded') }}</div>
              <div class="summary-value">{{ formatCurrencyLocal(result.amountNeeded) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">{{ t('tools.financialFreedom.yearsToFreedom') }}</div>
              <div class="summary-value">
                <template v-if="result.yearsToFreedom === 0">
                  {{ t('tools.financialFreedom.alreadyFree') }}
                </template>
                <template v-else-if="result.yearsToFreedom !== null">
                  {{ result.yearsToFreedom.toFixed(1) }} {{ t('tools.financialFreedom.years') }}
                </template>
                <template v-else>
                  > 100 {{ t('tools.financialFreedom.years') }}
                </template>
              </div>
            </div>
            <div class="summary-card">
              <div class="summary-label">{{ t('tools.financialFreedom.freedomDate') }}</div>
              <div class="summary-value">
                <template v-if="result.yearsToFreedom === 0">
                  {{ t('tools.financialFreedom.now') }}
                </template>
                <template v-else-if="result.freedomDate">
                  {{ formatDate(result.freedomDate, locale) }}
                </template>
                <template v-else>
                  —
                </template>
              </div>
            </div>
          </div>
        </div>

        <div v-if="isValidInput && result" class="panel p-6 sm:p-7">
          <div class="mb-5 flex flex-wrap items-center justify-between gap-4">
            <div>
              <p class="kicker mb-2">{{ t('tools.financialFreedom.withdrawalCapacity') }}</p>
              <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {{ t('tools.financialFreedom.withdrawalCapacity') }}
              </h3>
            </div>
            <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {{ formatPercent(withdrawalRate) }}
            </span>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="summary-card">
              <div class="summary-label">{{ t('tools.financialFreedom.monthly') }}</div>
              <div class="summary-value">{{ formatCurrencyLocal(result.monthlyWithdrawal) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">{{ t('tools.financialFreedom.weekly') }}</div>
              <div class="summary-value">{{ formatCurrencyLocal(result.weeklyWithdrawal) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">{{ t('tools.financialFreedom.daily') }}</div>
              <div class="summary-value">{{ formatCurrencyLocal(result.dailyWithdrawal) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-6">
        <div v-if="isValidInput && result" class="panel p-6 sm:p-7">
          <p class="kicker mb-2">{{ t('tools.financialFreedom.recommendation') }}</p>
          <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
            {{ t('tools.financialFreedom.recommendation') }}
          </h3>
          <div class="recommendation-card mt-5">
            <Icon name="heroicons:light-bulb" class="h-5 w-5 text-emerald-500" />
            <p class="whitespace-pre-line text-sm leading-6 text-slate-700 dark:text-slate-200">
              {{ localizedRecommendation }}
            </p>
          </div>
        </div>

        <div v-if="isValidInput && result" class="panel p-6 sm:p-7">
          <div class="mb-5 flex items-center justify-between gap-4">
            <div>
              <p class="kicker mb-2">{{ t('tools.financialFreedom.yearlyProjection') }}</p>
              <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {{ t('tools.financialFreedom.yearlyProjection') }}
              </h3>
            </div>
            <div class="text-right text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {{ result.yearlyProjection.length }} years
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="year in result.yearlyProjection"
              :key="year.year"
              class="projection-row"
              :class="year.isFreed ? 'projection-row-active' : ''"
            >
              <div class="flex items-center justify-between gap-4">
                <div>
                  <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {{ t('tools.financialFreedom.yearN', { n: year.year }) }}
                  </div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ t('tools.financialFreedom.startingAssets') }} {{ formatCurrencyLocal(year.startingAssets) }}
                  </div>
                </div>
                <div v-if="year.isFreed" class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  FIRE
                </div>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-3">
                <div class="projection-stat">
                  <span class="projection-label">{{ t('tools.financialFreedom.contribution') }}</span>
                  <span class="projection-value">+{{ formatCurrencyLocal(year.contribution) }}</span>
                </div>
                <div class="projection-stat">
                  <span class="projection-label">{{ t('tools.financialFreedom.returns') }}</span>
                  <span class="projection-value" :class="year.returns >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                    {{ year.returns >= 0 ? '+' : '' }}{{ formatCurrencyLocal(year.returns) }}
                  </span>
                </div>
                <div class="projection-stat">
                  <span class="projection-label">{{ t('tools.financialFreedom.endingAssets') }}</span>
                  <span class="projection-value">{{ formatCurrencyLocal(year.endingAssets) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="panel p-10 text-center">
          <Icon name="heroicons:banknotes" class="mx-auto h-14 w-14 text-slate-300 dark:text-slate-600" />
          <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {{ t('tools.financialFreedom.emptyState') }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');

.freedom-page {
  font-family: 'IBM Plex Sans', 'Avenir Next', 'Segoe UI', sans-serif;
  background:
    radial-gradient(900px 420px at 8% -8%, rgb(59 130 246 / 11%), transparent 62%),
    radial-gradient(820px 420px at 100% -8%, rgb(16 185 129 / 9%), transparent 62%),
    #f8fafc;
}

.panel {
  border: 1px solid rgb(191 219 254);
  border-radius: 1rem;
  background: rgb(255 255 255 / 84%);
  backdrop-filter: blur(8px);
  box-shadow: 0 12px 26px rgb(30 64 175 / 8%);
}

.kicker {
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  color: rgb(59 130 246);
  font-weight: 700;
}

.metric-card,
.summary-card,
.projection-stat {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.95rem;
  background: rgb(255 255 255 / 70%);
  padding: 1rem;
}

.metric-label,
.summary-label,
.projection-label,
.spotlight-stat-label,
.field-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgb(100 116 139);
}

.metric-value,
.summary-value,
.projection-value,
.spotlight-stat-value {
  margin-top: 0.5rem;
  display: block;
  font-size: 1.35rem;
  font-weight: 600;
  color: rgb(15 23 42);
}

.hero-spotlight {
  border: 1px solid rgb(30 64 175 / 20%);
  border-radius: 1rem;
  padding: 1.5rem;
  background:
    linear-gradient(160deg, rgb(15 23 42), rgb(15 23 42 / 94%) 48%, rgb(30 41 59) 100%);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 6%);
}

.hero-spotlight-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: rgb(148 163 184);
}

.hero-spotlight-value {
  margin-top: 0.5rem;
  font-size: 2.5rem;
  font-weight: 600;
  color: white;
}

.spotlight-stat {
  border: 1px solid rgb(148 163 184 / 18%);
  border-radius: 0.9rem;
  padding: 0.9rem 1rem;
  background: rgb(255 255 255 / 4%);
}

.subpanel,
.recommendation-card,
.projection-row {
  border: 1px solid rgb(226 232 240);
  border-radius: 1rem;
  background: rgb(248 250 252 / 78%);
  padding: 1rem;
}

.field-shell {
  position: relative;
  margin-top: 0.55rem;
}

.field-input {
  width: 100%;
  border: 1px solid rgb(203 213 225);
  border-radius: 0.9rem;
  background: rgb(255 255 255 / 90%);
  padding: 0.9rem 3.5rem 0.9rem 1rem;
  color: rgb(15 23 42);
  transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
}

.field-input:focus {
  outline: none;
  border-color: rgb(59 130 246);
  box-shadow: 0 0 0 4px rgb(191 219 254);
}

.field-unit {
  position: absolute;
  right: 0.95rem;
  top: 50%;
  transform: translateY(-50%);
  font-size: 0.8rem;
  font-weight: 600;
  color: rgb(100 116 139);
}

.field-hint {
  margin-top: 0.45rem;
  font-size: 0.8rem;
  color: rgb(100 116 139);
}

.range-card,
.choice-card {
  border: 1px solid rgb(226 232 240);
  border-radius: 0.95rem;
  background: rgb(255 255 255 / 70%);
  padding: 1rem;
  text-align: left;
  transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.choice-card:hover,
.range-card:hover {
  transform: translateY(-1px);
}

.choice-card-active {
  border-color: rgb(59 130 246);
  background: rgb(239 246 255);
}

.range-card-active-slate {
  border-color: rgb(100 116 139);
  background: rgb(248 250 252);
}

.range-card-active-green {
  border-color: rgb(16 185 129);
  background: rgb(236 253 245);
}

.range-card-active-violet {
  border-color: rgb(139 92 246);
  background: rgb(245 243 255);
}

.result-banner {
  background:
    radial-gradient(circle at top right, rgb(56 189 248 / 30%), transparent 28%),
    linear-gradient(145deg, rgb(15 23 42), rgb(30 41 59));
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 0.8rem;
  padding: 0.7rem 1rem;
  color: white;
  background: rgb(30 64 175 / 88%);
  transition: background-color 180ms ease;
}

.action-btn:hover {
  background: rgb(29 78 216);
}

.recommendation-card {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}

.projection-row-active {
  border-color: rgb(16 185 129 / 45%);
  background: rgb(236 253 245 / 70%);
}

:global(.dark .freedom-page),
:global(.dark-mode .freedom-page) {
  background:
    radial-gradient(900px 420px at 8% -8%, rgb(59 130 246 / 9%), transparent 62%),
    radial-gradient(820px 420px at 100% -8%, rgb(16 185 129 / 7%), transparent 62%),
    rgb(2 6 18);
}

:global(.dark .panel),
:global(.dark-mode .panel) {
  border-color: rgb(71 85 105);
  background: rgb(3 10 24 / 92%);
  box-shadow: 0 12px 26px rgb(2 6 23 / 45%);
}

:global(.dark .metric-card),
:global(.dark .summary-card),
:global(.dark .projection-stat),
:global(.dark .subpanel),
:global(.dark .recommendation-card),
:global(.dark .projection-row),
:global(.dark .range-card),
:global(.dark .choice-card),
:global(.dark-mode .metric-card),
:global(.dark-mode .summary-card),
:global(.dark-mode .projection-stat),
:global(.dark-mode .subpanel),
:global(.dark-mode .recommendation-card),
:global(.dark-mode .projection-row),
:global(.dark-mode .range-card),
:global(.dark-mode .choice-card) {
  border-color: rgb(51 65 85);
  background: rgb(8 15 30 / 78%);
}

:global(.dark .metric-label),
:global(.dark .summary-label),
:global(.dark .projection-label),
:global(.dark .spotlight-stat-label),
:global(.dark .field-label),
:global(.dark .field-hint),
:global(.dark-mode .metric-label),
:global(.dark-mode .summary-label),
:global(.dark-mode .projection-label),
:global(.dark-mode .spotlight-stat-label),
:global(.dark-mode .field-label),
:global(.dark-mode .field-hint) {
  color: rgb(148 163 184);
}

:global(.dark .metric-value),
:global(.dark .summary-value),
:global(.dark .projection-value),
:global(.dark .spotlight-stat-value),
:global(.dark-mode .metric-value),
:global(.dark-mode .summary-value),
:global(.dark-mode .projection-value),
:global(.dark-mode .spotlight-stat-value) {
  color: rgb(241 245 249);
}

:global(.dark .field-input),
:global(.dark-mode .field-input) {
  border-color: rgb(71 85 105);
  background: rgb(15 23 42 / 88%);
  color: rgb(241 245 249);
}

:global(.dark .field-input:focus),
:global(.dark-mode .field-input:focus) {
  border-color: rgb(96 165 250);
  box-shadow: 0 0 0 4px rgb(30 41 59);
}

:global(.dark .field-unit),
:global(.dark-mode .field-unit) {
  color: rgb(148 163 184);
}

:global(.dark .choice-card-active),
:global(.dark-mode .choice-card-active) {
  border-color: rgb(96 165 250);
  background: rgb(15 23 42);
}

:global(.dark .range-card-active-slate),
:global(.dark-mode .range-card-active-slate) {
  border-color: rgb(100 116 139);
  background: rgb(15 23 42);
}

:global(.dark .range-card-active-green),
:global(.dark-mode .range-card-active-green) {
  border-color: rgb(16 185 129);
  background: rgb(2 44 34);
}

:global(.dark .range-card-active-violet),
:global(.dark-mode .range-card-active-violet) {
  border-color: rgb(139 92 246);
  background: rgb(30 27 75);
}

:global(.dark .projection-row-active),
:global(.dark-mode .projection-row-active) {
  border-color: rgb(16 185 129 / 45%);
  background: rgb(2 44 34 / 55%);
}
</style>
