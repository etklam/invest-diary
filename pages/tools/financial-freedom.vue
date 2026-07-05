<script setup lang="ts">
import {
  withdrawalRatePresets,
} from '~/lib/financialFreedom'
import { formatCurrency, formatPercent, formatCompactCurrency } from '~/lib/format'
import { formatYearMonth as formatDate } from '~/lib/dates'
import { useFinancialFreedomCalculator } from '~/composables/useFinancialFreedomCalculator'
import LedgerCard from '~/components/LedgerCard.vue'
import BaseButton from '~/components/BaseButton.vue'

const { t, locale } = useI18n()
const toast = useToast()

// Use composable for state management
const {
  annualExpenses,
  currentAssets,
  monthlyContribution,
  expectedReturn,
  withdrawalRatePreset,
  currentAge,
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

const formatCurrencyLocal = (value: number) => formatCurrency(value, { decimals: 0, locale: locale.value })

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
  <div class="min-h-screen bg-dt-bg font-body">
    <section class="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <LedgerCard class="p-6 sm:p-8">
        <div class="grid gap-8 lg:grid-cols-[1.25fr_0.9fr] lg:items-center">
          <div>
            <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-3">{{ t('tools.financialFreedom.heroKicker') }}</p>
            <h1 class="font-display text-3xl font-semibold tracking-tight text-dt-text sm:text-4xl">
              {{ t('tools.financialFreedom.title') }}
            </h1>
            <p class="mt-3 max-w-2xl text-sm leading-6 text-dt-text-muted sm:text-base">
              {{ t('tools.financialFreedom.subtitle') }}
            </p>

            <div class="mt-6 grid gap-3 sm:grid-cols-3">
              <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
                <span class="data-label">{{ t('tools.financialFreedom.fireNumber') }}</span>
                <span class="data-value">
                  {{ result ? formatCompactValue(result.fireNumber) : '—' }}
                </span>
              </div>
              <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
                <span class="data-label">{{ t('tools.financialFreedom.amountNeeded') }}</span>
                <span class="data-value">
                  {{ result ? formatCompactValue(result.amountNeeded) : '—' }}
                </span>
              </div>
              <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
                <span class="data-label">{{ t('tools.financialFreedom.yearsToFreedom') }}</span>
                <span class="data-value">
                  <template v-if="result?.yearsToFreedom === 0">
                    {{ t('tools.financialFreedom.alreadyFree') }}
                  </template>
                  <template v-else-if="result?.yearsToFreedom !== null && result?.yearsToFreedom !== undefined">
                    {{ result.yearsToFreedom.toFixed(1) }}
                  </template>
                  <template v-else>
                    —
                  </template>
                </span>
              </div>
            </div>
          </div>

          <div class="border border-dt-border rounded-xl bg-dt-surface p-5">
            <div class="text-xs font-bold uppercase tracking-[0.16em] text-dt-text-muted">{{ t('tools.financialFreedom.withdrawalRate') }}</div>
            <div class="hero-value mt-2 text-dt-text">{{ formatPercent(withdrawalRate) }}</div>
            <p class="mt-1 text-sm leading-6 text-dt-text-muted">
              {{ t(`tools.financialFreedom.withdrawalPresets.${withdrawalRatePreset}.description`) }}
            </p>

            <div class="mt-5">
              <div class="mb-2 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-dt-text-muted">
                <span>{{ t('tools.financialFreedom.expectedReturn') }}</span>
                <span>{{ expectedReturn }}%</span>
              </div>
              <div class="flex items-center gap-2">
                <template v-for="(indicator, index) in returnRateIndicator" :key="indicator.level">
                  <div class="h-2.5 flex-1 rounded-full transition-all duration-300" :class="indicator.colorClass" />
                  <span v-if="index < returnRateIndicator.length - 1" class="text-[10px] text-dt-text-muted">•</span>
                </template>
              </div>
            </div>

            <div class="mt-6 grid gap-3 sm:grid-cols-2">
              <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-3">
                <span class="data-label">{{ t('tools.financialFreedom.monthlyContribution') }}</span>
                <span class="data-value">{{ monthlyContribution ? formatCompactValue(monthlyContribution) : '—' }}</span>
              </div>
              <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-3">
                <span class="data-label">{{ t('tools.financialFreedom.currentAssets') }}</span>
                <span class="data-value">{{ currentAssets !== null ? formatCompactValue(currentAssets) : '—' }}</span>
              </div>
            </div>
          </div>
        </div>
      </LedgerCard>
    </section>

    <section class="mx-auto grid max-w-7xl gap-6 px-4 pb-12 sm:px-6 lg:grid-cols-[1.15fr_0.85fr] lg:px-8">
      <div class="space-y-6">
        <LedgerCard>
          <div class="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-2">{{ t('tools.financialFreedom.inputParams') }}</p>
              <h2 class="text-xl font-semibold text-dt-text">
                {{ t('tools.financialFreedom.inputParams') }}
              </h2>
            </div>
            <div class="rounded-dt-pill border border-dt-info/30 bg-dt-info/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-dt-info">
              {{ t(`tools.financialFreedom.returnRateLevels.${returnRateLevel}.label`) }}
            </div>
          </div>

          <div class="grid gap-5 md:grid-cols-2">
            <div>
              <label class="data-label">{{ t('tools.financialFreedom.annualExpenses') }}</label>
              <div class="relative mt-1.5">
                <input v-model.number="annualExpenses" type="number" min="0" step="10000" :placeholder="t('tools.financialFreedom.annualExpensesPlaceholder')" class="w-full border border-dt-border rounded-lg bg-dt-surface px-3 py-2.5 text-dt-text focus:border-dt-primary focus:outline-none">
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold font-mono text-dt-text-muted">{{ t('tools.financialFreedom.units.perYearCurrency') }}</span>
              </div>
              <p class="mt-1.5 text-xs text-dt-text-muted">{{ t('tools.financialFreedom.annualExpensesHint') }}</p>
            </div>

            <div>
              <label class="data-label">{{ t('tools.financialFreedom.currentAssets') }}</label>
              <div class="relative mt-1.5">
                <input v-model.number="currentAssets" type="number" min="0" step="100000" :placeholder="t('tools.financialFreedom.currentAssetsPlaceholder')" class="w-full border border-dt-border rounded-lg bg-dt-surface px-3 py-2.5 text-dt-text focus:border-dt-primary focus:outline-none">
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold font-mono text-dt-text-muted">{{ t('tools.financialFreedom.units.currency') }}</span>
              </div>
            </div>

            <div>
              <label class="data-label">{{ t('tools.financialFreedom.monthlyContribution') }}</label>
              <div class="relative mt-1.5">
                <input v-model.number="monthlyContribution" type="number" min="0" step="5000" :placeholder="t('tools.financialFreedom.monthlyContributionPlaceholder')" class="w-full border border-dt-border rounded-lg bg-dt-surface px-3 py-2.5 text-dt-text focus:border-dt-primary focus:outline-none">
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold font-mono text-dt-text-muted">{{ t('tools.financialFreedom.units.perMonthCurrency') }}</span>
              </div>
            </div>

            <div>
              <label class="data-label">{{ t('tools.financialFreedom.expectedReturn') }}</label>
              <div class="relative mt-1.5">
                <input v-model.number="expectedReturn" type="number" min="0" max="30" step="0.5" class="w-full border border-dt-border rounded-lg bg-dt-surface px-3 py-2.5 text-dt-text focus:border-dt-primary focus:outline-none">
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold font-mono text-dt-text-muted">%</span>
              </div>
              <p class="mt-1.5 text-xs text-dt-text-muted">{{ t('tools.financialFreedom.expectedReturnHint') }}</p>
            </div>

            <div>
              <label class="data-label">{{ t('tools.financialFreedom.currentAge') }}</label>
              <div class="relative mt-1.5">
                <input v-model.number="currentAge" type="number" min="0" max="120" step="1" :placeholder="t('tools.financialFreedom.currentAgePlaceholder')" class="w-full border border-dt-border rounded-lg bg-dt-surface px-3 py-2.5 text-dt-text focus:border-dt-primary focus:outline-none">
                <span class="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold font-mono text-dt-text-muted">{{ t('tools.financialFreedom.units.yearsOld') }}</span>
              </div>
              <p class="mt-1.5 text-xs text-dt-text-muted">{{ t('tools.financialFreedom.currentAgeHint') }}</p>
            </div>
          </div>

          <div class="mt-6 min-w-0 border border-dt-border rounded-lg bg-dt-surface-raised p-4">
            <div class="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h3 class="text-sm font-semibold uppercase tracking-[0.14em] text-dt-text-muted">
                {{ t('tools.financialFreedom.expectedReturn') }} {{ t('common.range') }}
              </h3>
              <span class="text-sm font-semibold text-dt-text">{{ expectedReturn }}%</span>
            </div>

            <div class="grid gap-3 sm:grid-cols-3">
              <div class="border border-dt-border rounded-lg bg-dt-surface p-4 text-left transition-colors duration-180" :class="returnRateLevel === 'conservative' ? 'border-dt-text-muted bg-dt-surface-raised' : ''">
                <div class="mb-2 flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-full bg-slate-500" />
                  <span class="text-sm font-semibold text-dt-text">
                    {{ t('tools.financialFreedom.returnRateLevels.conservative.label') }}
                  </span>
                </div>
                <div class="text-xs text-dt-text-muted">
                  {{ t('tools.financialFreedom.returnRateLevels.conservative.range') }}
                </div>
                <p class="mt-2 text-xs leading-5 text-dt-text-muted">
                  {{ t('tools.financialFreedom.returnRateLevels.conservative.description') }}
                </p>
              </div>

              <div class="border border-dt-border rounded-lg bg-dt-surface p-4 text-left transition-colors duration-180" :class="returnRateLevel === 'target' ? 'border-dt-accent bg-dt-surface' : ''">
                <div class="mb-2 flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                  <span class="text-sm font-semibold text-dt-text">
                    {{ t('tools.financialFreedom.returnRateLevels.target.label') }}
                  </span>
                </div>
                <div class="text-xs text-dt-text-muted">
                  {{ t('tools.financialFreedom.returnRateLevels.target.range') }}
                </div>
                <p class="mt-2 text-xs leading-5 text-dt-text-muted">
                  {{ t('tools.financialFreedom.returnRateLevels.target.description') }}
                </p>
              </div>

              <div class="border border-dt-border rounded-lg bg-dt-surface p-4 text-left transition-colors duration-180" :class="returnRateLevel === 'expert' ? 'border-dt-primary bg-dt-surface' : ''">
                <div class="mb-2 flex items-center gap-2">
                  <div class="h-2.5 w-2.5 rounded-full bg-violet-500" />
                  <span class="text-sm font-semibold text-dt-text">
                    {{ t('tools.financialFreedom.returnRateLevels.expert.label') }}
                  </span>
                </div>
                <div class="text-xs text-dt-text-muted">
                  {{ t('tools.financialFreedom.returnRateLevels.expert.range') }}
                </div>
                <p class="mt-2 text-xs leading-5 text-dt-text-muted">
                  {{ t('tools.financialFreedom.returnRateLevels.expert.description') }}
                </p>
              </div>
            </div>
          </div>

          <div class="mt-6">
            <label class="data-label">{{ t('tools.financialFreedom.withdrawalRate') }}</label>
            <div class="grid gap-3 sm:grid-cols-3">
              <button
                v-for="preset in withdrawalRatePresets"
                :key="preset.id"
                type="button"
                class="cursor-pointer border border-dt-border rounded-lg bg-dt-surface p-4 text-left transition-colors duration-180"
                :class="withdrawalRatePreset === preset.id ? 'border-dt-primary bg-dt-surface' : ''"
                @click="withdrawalRatePreset = preset.id"
              >
                <div class="text-sm font-semibold">{{ getPresetName(preset) }}</div>
                <div class="mt-1 text-xs text-dt-text-muted">{{ preset.rate }}%</div>
              </button>
            </div>
          </div>
        </LedgerCard>

        <div v-if="isValidInput && result" class="overflow-hidden rounded-xl border border-dt-border shadow-sm">
          <div class="bg-dt-primary rounded-t-xl p-6 sm:p-7">
            <div class="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
              <div>
                <p class="text-xs font-semibold uppercase tracking-[0.16em] text-white/80">
                  {{ t('tools.financialFreedom.fireNumber') }}
                </p>
                <div class="mt-2 text-4xl font-semibold tracking-tight text-white">
                  {{ formatCompactValue(result.fireNumber) }}
                </div>
              </div>
              <BaseButton variant="primary" class="w-full sm:w-auto" @click="copyToClipboard">
                <Icon :name="copySuccess ? 'heroicons:check' : 'heroicons:clipboard-document'" class="mr-2 h-4 w-4" />
                {{ copySuccess ? t('tools.financialFreedom.copied') : t('tools.financialFreedom.copyToClipboard') }}
              </BaseButton>
            </div>

            <div class="mt-6">
              <div class="mb-2 flex items-center justify-between text-sm text-white/90">
                <span>{{ t('tools.financialFreedom.progress', { percent: result.currentProgress.toFixed(1) }) }}</span>
                <span>{{ result.currentProgress.toFixed(1) }}%</span>
              </div>
              <div class="h-3 overflow-hidden rounded-full bg-white/15">
                <div class="h-full rounded-full transition-all duration-500" :class="progressColor" :style="{ width: `${Math.min(100, result.currentProgress)}%` }" />
              </div>
            </div>
          </div>

          <div class="grid gap-4 border-t border-dt-border bg-dt-surface p-6 sm:grid-cols-3 sm:p-7">
            <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
              <span class="data-label">{{ t('tools.financialFreedom.amountNeeded') }}</span>
              <span class="data-value">{{ formatCompactValue(result.amountNeeded) }}</span>
            </div>
            <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
              <span class="data-label">{{ t('tools.financialFreedom.yearsToFreedom') }}</span>
              <span class="data-value">
                <template v-if="result.yearsToFreedom === 0">
                  {{ t('tools.financialFreedom.alreadyFree') }}
                </template>
                <template v-else-if="result.yearsToFreedom !== null">
                  {{ result.yearsToFreedom.toFixed(1) }} {{ t('tools.financialFreedom.years') }}
                </template>
                <template v-else>
                  > 100 {{ t('tools.financialFreedom.years') }}
                </template>
              </span>
            </div>
            <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
              <span class="data-label">{{ t('tools.financialFreedom.freedomDate') }}</span>
              <span class="data-value">
                <template v-if="result.yearsToFreedom === 0">
                  {{ t('tools.financialFreedom.now') }}
                </template>
                <template v-else-if="result.freedomDate">
                  {{ formatDate(result.freedomDate, locale) }}
                </template>
                <template v-else>
                  —
                </template>
              </span>
            </div>
          </div>
        </div>

        <LedgerCard v-if="isValidInput && result">
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-2">{{ t('tools.financialFreedom.withdrawalCapacity') }}</p>
              <h3 class="text-xl font-semibold text-dt-text">
                {{ t('tools.financialFreedom.withdrawalCapacity') }}
              </h3>
            </div>
            <span class="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-semibold text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
              {{ formatPercent(withdrawalRate) }}
            </span>
          </div>

          <div class="grid gap-4 sm:grid-cols-3">
            <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
              <span class="data-label">{{ t('tools.financialFreedom.monthly') }}</span>
              <span class="data-value">{{ formatCompactValue(result.monthlyWithdrawal) }}</span>
            </div>
            <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
              <span class="data-label">{{ t('tools.financialFreedom.weekly') }}</span>
              <span class="data-value">{{ formatCompactValue(result.weeklyWithdrawal) }}</span>
            </div>
            <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
              <span class="data-label">{{ t('tools.financialFreedom.daily') }}</span>
              <span class="data-value">{{ formatCompactValue(result.dailyWithdrawal) }}</span>
            </div>
          </div>
        </LedgerCard>
      </div>

      <div class="space-y-6">
        <LedgerCard v-if="isValidInput && result">
          <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-2">{{ t('tools.financialFreedom.recommendation') }}</p>
          <h3 class="text-xl font-semibold text-dt-text">
            {{ t('tools.financialFreedom.recommendation') }}
          </h3>
          <div class="mt-5 flex gap-3 items-start border border-dt-border rounded-lg bg-dt-surface-raised p-4">
            <Icon name="heroicons:light-bulb" class="h-5 w-5 shrink-0 text-emerald-500" />
            <p class="whitespace-pre-line text-sm leading-6 text-dt-text">
              {{ localizedRecommendation }}
            </p>
          </div>
        </LedgerCard>

        <LedgerCard v-if="isValidInput && result">
          <div class="mb-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p class="text-xs font-bold uppercase tracking-[0.15em] text-dt-secondary mb-2">{{ t('tools.financialFreedom.yearlyProjection') }}</p>
              <h3 class="text-xl font-semibold text-dt-text">
                {{ t('tools.financialFreedom.yearlyProjection') }}
              </h3>
            </div>
            <div class="text-right text-xs uppercase tracking-[0.16em] text-dt-text-muted">
              {{ result.yearlyProjection.length }} {{ t('tools.financialFreedom.years') }}
            </div>
          </div>

          <div class="space-y-3">
            <div
              v-for="year in result.yearlyProjection"
              :key="year.year"
              class="min-w-0 border border-dt-border rounded-lg bg-dt-surface-raised p-4"
              :class="year.isFreed ? 'border-dt-accent bg-dt-surface' : ''"
            >
              <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div class="text-sm font-semibold text-dt-text">
                    {{ t('tools.financialFreedom.yearN', { n: year.year }) }}
                    <span v-if="year.age !== null && year.age !== undefined" class="ml-2 font-normal text-dt-text-muted">· {{ year.age }} {{ t('tools.financialFreedom.yearsOld') }}</span>
                  </div>
                  <div class="mt-1 text-xs text-dt-text-muted">
                    {{ t('tools.financialFreedom.startingAssets') }} {{ formatCompactValue(year.startingAssets) }}
                  </div>
                </div>
                <div v-if="year.isFreed" class="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                  {{ t('tools.financialFreedom.freed') }}
                </div>
              </div>

              <div class="mt-4 grid gap-3 sm:grid-cols-2">
                <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
                  <span class="data-label">{{ t('tools.financialFreedom.contribution') }}</span>
                  <span class="data-value">+{{ formatCompactValue(year.contribution) }}</span>
                </div>
                <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
                  <span class="data-label">{{ t('tools.financialFreedom.returns') }}</span>
                  <span class="data-value" :class="year.returns >= 0 ? 'text-dt-success' : 'text-dt-danger'">
                    {{ year.returns >= 0 ? '+' : '' }}{{ formatCompactValue(year.returns) }}
                  </span>
                </div>
                <div class="min-w-0 border border-dt-border rounded-lg bg-dt-surface p-4">
                  <span class="data-label">{{ t('tools.financialFreedom.endingAssets') }}</span>
                  <span class="data-value">{{ formatCompactValue(year.endingAssets) }}</span>
                </div>
              </div>
            </div>
          </div>
        </LedgerCard>

        <LedgerCard v-else class="p-10 text-center">
          <Icon name="heroicons:banknotes" class="mx-auto h-14 w-14 text-dt-text-muted" />
          <p class="mt-4 text-sm text-dt-text-muted">
            {{ t('tools.financialFreedom.emptyState') }}
          </p>
        </LedgerCard>
      </div>
    </section>
  </div>
</template>

<style scoped>
.data-label {
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

.data-value {
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

.hero-value {
  overflow-wrap: anywhere;
  word-break: break-word;
  line-height: 1.1;
  font-size: clamp(1.75rem, 4vw, 2.5rem);
  font-weight: 600;
  font-family: var(--font-data);
}

@media (max-width: 639px) {
  .recommendation-card {
    flex-direction: column;
  }
}
</style>
