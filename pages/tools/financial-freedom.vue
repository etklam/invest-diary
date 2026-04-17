<script setup lang="ts">
import {
  withdrawalRatePresets,
  formatCurrency,
  formatPercent,
  formatDate
} from '~/lib/financialFreedom'
import { useFinancialFreedomCalculator } from '~/composables/useFinancialFreedomCalculator'

const { t, locale } = useI18n()
const toast = useToast()

// Use composable for state management
const {
  annualExpenses,
  currentAssets,
  monthlyContribution,
  expectedReturn,
  withdrawalRatePreset,
  copySuccess,
  returnRateLevel,
  returnRateIndicator,
  withdrawalRate,
  isValidInput,
  result,
  progressColor
} = useFinancialFreedomCalculator()

// UI-specific computed
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

// Utility functions
const getPresetName = (preset: typeof withdrawalRatePresets[0]) => {
  return t(`tools.financialFreedom.withdrawalPresets.${preset.id}.name`)
}

const formatCurrencyLocal = (value: number) => formatCurrency(value, locale.value)

const formatCompactValue = (value: number) => {
  const abs = Math.abs(value)
  const currentLocale = locale.value

  const formatCompactNumber = (scaled: number) => {
    const digits = Math.abs(scaled) >= 100 ? 0 : Math.abs(scaled) >= 10 ? 1 : 1
    return new Intl.NumberFormat(currentLocale === 'en' ? 'en-US' : currentLocale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: digits
    }).format(scaled)
  }

  if (currentLocale === 'en') {
    if (abs >= 1_000_000) return `$${formatCompactNumber(value / 1_000_000)}M`
    if (abs >= 1_000) return `$${formatCompactNumber(value / 1_000)}K`
    return formatCurrencyLocal(value)
  }

  if (abs >= 1_000_000) return `$${formatCompactNumber(value / 1_000_000)}百萬`
  if (abs >= 10_000) return `$${formatCompactNumber(value / 10_000)}萬`
  if (abs >= 1_000) return `$${formatCompactNumber(value / 1_000)}千`
  return formatCurrencyLocal(value)
}

// Actions
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
            <p class="kicker mb-3">{{ t('tools.financialFreedom.heroKicker') }}</p>
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
                  {{ result ? formatCompactValue(result.fireNumber) : '—' }}
                </div>
              </div>
              <div class="metric-card">
                <div class="metric-label">{{ t('tools.financialFreedom.amountNeeded') }}</div>
                <div class="metric-value">
                  {{ result ? formatCompactValue(result.amountNeeded) : '—' }}
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
                <span class="spotlight-stat-value">{{ monthlyContribution ? formatCompactValue(monthlyContribution) : '—' }}</span>
              </div>
              <div class="spotlight-stat">
                <span class="spotlight-stat-label">{{ t('tools.financialFreedom.currentAssets') }}</span>
                <span class="spotlight-stat-value">{{ currentAssets !== null ? formatCompactValue(currentAssets) : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <section class="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
      <div class="space-y-6">
        <div class="panel p-6 sm:p-7">
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
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
                <span class="field-unit">{{ t('tools.financialFreedom.units.perYearCurrency') }}</span>
              </div>
              <p class="field-hint">{{ t('tools.financialFreedom.annualExpensesHint') }}</p>
            </div>

            <div>
              <label class="field-label">{{ t('tools.financialFreedom.currentAssets') }}</label>
              <div class="field-shell">
                <input v-model.number="currentAssets" type="number" min="0" step="100000" :placeholder="t('tools.financialFreedom.currentAssetsPlaceholder')" class="field-input">
                <span class="field-unit">{{ t('tools.financialFreedom.units.currency') }}</span>
              </div>
            </div>

            <div>
              <label class="field-label">{{ t('tools.financialFreedom.monthlyContribution') }}</label>
              <div class="field-shell">
                <input v-model.number="monthlyContribution" type="number" min="0" step="5000" :placeholder="t('tools.financialFreedom.monthlyContributionPlaceholder')" class="field-input">
                <span class="field-unit">{{ t('tools.financialFreedom.units.perMonthCurrency') }}</span>
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
            <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
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
            <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-sky-100/80">
                  {{ t('tools.financialFreedom.fireNumber') }}
                </p>
                <div class="mt-2 text-4xl font-semibold tracking-tight text-white">
                  {{ formatCompactValue(result.fireNumber) }}
                </div>
              </div>
              <button type="button" class="action-btn w-full cursor-pointer sm:w-auto" @click="copyToClipboard">
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
              <div class="summary-value">{{ formatCompactValue(result.amountNeeded) }}</div>
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
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
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
              <div class="summary-value">{{ formatCompactValue(result.monthlyWithdrawal) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">{{ t('tools.financialFreedom.weekly') }}</div>
              <div class="summary-value">{{ formatCompactValue(result.weeklyWithdrawal) }}</div>
            </div>
            <div class="summary-card">
              <div class="summary-label">{{ t('tools.financialFreedom.daily') }}</div>
              <div class="summary-value">{{ formatCompactValue(result.dailyWithdrawal) }}</div>
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
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="kicker mb-2">{{ t('tools.financialFreedom.yearlyProjection') }}</p>
              <h3 class="text-xl font-semibold text-slate-900 dark:text-slate-100">
                {{ t('tools.financialFreedom.yearlyProjection') }}
              </h3>
            </div>
            <div class="text-right text-xs uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
              {{ result.yearlyProjection.length }} {{ t('tools.financialFreedom.years') }}
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="year in result.yearlyProjection"
              :key="year.year"
              class="projection-row"
              :class="year.isFreed ? 'projection-row-active' : ''"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-sm font-semibold text-slate-900 dark:text-slate-100">
                    {{ t('tools.financialFreedom.yearN', { n: year.year }) }}
                  </div>
                  <div class="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {{ t('tools.financialFreedom.startingAssets') }} {{ formatCompactValue(year.startingAssets) }}
                  </div>
                </div>
                <div v-if="year.isFreed" class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {{ t('tools.financialFreedom.freed') }}
                </div>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="projection-stat">
                  <span class="projection-label">{{ t('tools.financialFreedom.contribution') }}</span>
                  <span class="projection-value">+{{ formatCompactValue(year.contribution) }}</span>
                </div>
                <div class="projection-stat">
                  <span class="projection-label">{{ t('tools.financialFreedom.returns') }}</span>
                  <span class="projection-value" :class="year.returns >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'">
                    {{ year.returns >= 0 ? '+' : '' }}{{ formatCompactValue(year.returns) }}
                  </span>
                </div>
                <div class="projection-stat">
                  <span class="projection-label">{{ t('tools.financialFreedom.endingAssets') }}</span>
                  <span class="projection-value">{{ formatCompactValue(year.endingAssets) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="panel p-10 text-center">
          <Icon name="heroicons:banknotes" class="mx-auto h-14 w-14 text-slate-300 dark:text-slate-300" />
          <p class="mt-4 text-sm text-slate-500 dark:text-slate-400">
            {{ t('tools.financialFreedom.emptyState') }}
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.freedom-page {
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
.projection-stat {
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
  font-size: clamp(1rem, 1.3vw + 0.9rem, 1.35rem);
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
  line-height: 1.1;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
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
.recommendation-card,
.projection-row {
  min-width: 0;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  background: var(--color-surface-muted);
  padding: 1rem;
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
  transition: border-color 180ms ease, box-shadow 180ms ease, background-color 180ms ease;
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

.range-card,
.choice-card {
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: var(--color-surface);
  padding: 1rem;
  text-align: left;
  transition: border-color 180ms ease, background-color 180ms ease, transform 180ms ease;
}

.choice-card:hover,
.range-card:hover {
  transform: translateY(-1px);
}

.choice-card-active {
  border-color: var(--color-secondary);
  background: color-mix(in srgb, var(--color-secondary) 8%, var(--color-surface));
}

.range-card-active-slate {
  border-color: var(--color-text-soft);
  background: var(--color-surface-muted);
}

.range-card-active-green {
  border-color: var(--color-accent);
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
}

.range-card-active-violet {
  border-color: #8b5cf6;
  background: color-mix(in srgb, #8b5cf6 8%, var(--color-surface));
}

.result-banner {
  background:
    radial-gradient(circle at top right, color-mix(in srgb, var(--color-info) 35%, transparent), transparent 28%),
    linear-gradient(145deg, var(--color-panel-ink), color-mix(in srgb, var(--color-panel-ink) 80%, var(--color-surface-strong)));
}

.action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-pill);
  padding: 0.7rem 1.2rem;
  color: white;
  background: var(--color-primary);
  transition: background-color var(--motion-fast) var(--easing-standard), transform var(--motion-fast) var(--easing-standard);
}

.action-btn:hover {
  background: var(--color-primary-active);
  transform: translateY(-1px);
}

.recommendation-card {
  display: flex;
  gap: 0.85rem;
  align-items: flex-start;
}

.projection-row-active {
  border-color: color-mix(in srgb, var(--color-accent) 45%, transparent);
  background: color-mix(in srgb, var(--color-accent) 8%, var(--color-surface));
}

/* Typography & color overrides for Tailwind hardcoded classes */
.freedom-page h1 {
  font-family: var(--font-display);
  color: var(--color-text);
}

.freedom-page h2,
.freedom-page h3 {
  color: var(--color-text);
}

@media (max-width: 639px) {
  .recommendation-card {
    flex-direction: column;
  }
}

</style>
