<script setup lang="ts">
import {
  calculateFinancialFreedom,
  withdrawalRatePresets,
  formatCurrency,
  formatPercent,
  formatDate
} from '~/lib/financialFreedom'
import type { FinancialFreedomInput, WithdrawalRatePreset } from '~/lib/financialFreedom'
import type { FinancialFreedomInput, WithdrawalRatePreset } from '~/lib/financialFreedom'

const { t, locale } = useI18n()
const toast = useToast()

// Form state
const annualExpenses = ref<number | null>(600000) // 年度支出 (預設60萬)
const currentAssets = ref<number | null>(1000000) // 目前資產 (預設100萬)
const monthlyContribution = ref<number | null>(20000) // 每月投入 (預設2萬)
const expectedReturn = ref<number>(8) // 預期年化報酬率
const withdrawalRatePreset = ref<WithdrawalRatePreset>('moderate') // 預設4%
const customWithdrawalRate = ref<number>(4) // 自訂提領率
const inflationRate = ref<number>(2) // 通膨率

// Computed
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

// Calculation result
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

// Progress bar color
const progressColor = computed(() => {
  const progress = result.value?.currentProgress ?? 0
  if (progress >= 75) return 'bg-green-500'
  if (progress >= 50) return 'bg-blue-500'
  if (progress >= 25) return 'bg-amber-500'
  return 'bg-gray-400'
})

// Get localized preset name
const getPresetName = (preset: typeof withdrawalRatePresets[0]) => {
  return t(`tools.financialFreedom.withdrawalPresets.${preset.id}.name`)
}

// Localized formatCurrency wrapper
const formatCurrencyLocal = (value: number) => formatCurrency(value, locale.value)

// Copy to clipboard
const copySuccess = ref(false)

const copyToClipboard = async () => {
  if (!result.value) return

  const lines: string[] = []
  const isEnglish = locale.value === 'en'
  const isTraditional = locale.value === 'zh-TW'

  // Title
  lines.push(isEnglish ? '# Financial Freedom Analysis' : (isTraditional ? '# 財務自由分析' : '# 财务自由分析'))
  lines.push('')

  // Input Parameters
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

  // Financial Target
  lines.push(isEnglish ? '## Financial Target' : (isTraditional ? '## 財務目標' : '## 财务目标'))
  lines.push('')
  lines.push(`- **${isEnglish ? 'FIRE Number' : '財務自由金額'}**: ${formatCurrencyLocal(result.value.fireNumber)}`)
  lines.push(`- **${isEnglish ? 'Progress' : '完成進度'}**: ${result.value.currentProgress.toFixed(1)}%`)
  lines.push(`- **${isEnglish ? 'Amount Needed' : '還需要'}**: ${formatCurrencyLocal(result.value.amountNeeded)}`)
  lines.push('')

  // Time to Freedom
  lines.push(isEnglish ? '## Time to Freedom' : (isTraditional ? '## 距離財務自由' : '## 距离财务自由'))
  lines.push('')
  if (result.value.yearsToFreedom === 0) {
    lines.push(`- 🎉 **${isEnglish ? 'Congratulations! You are financially free!' : '恭喜！您已達成財務自由！'}**`)
  } else if (result.value.yearsToFreedom !== null) {
    lines.push(`- **${isEnglish ? 'Years to Freedom' : '所需年數'}**: ${result.value.yearsToFreedom.toFixed(1)} ${isEnglish ? 'years' : '年'}`)
    lines.push(`- **${isEnglish ? 'Target Date' : '預計達成'}**: ${formatDate(result.value.freedomDate!, locale.value)}`)
  }
  lines.push('')

  // Withdrawal Capacity
  lines.push(isEnglish ? '## Withdrawal Capacity (After Freedom)' : (isTraditional ? '## 達成後可提領金額' : '## 达成后可提领金额'))
  lines.push('')
  lines.push(`- **${isEnglish ? 'Monthly' : '每月'}**: ${formatCurrencyLocal(result.value.monthlyWithdrawal)}`)
  lines.push(`- **${isEnglish ? 'Weekly' : '每週'}**: ${formatCurrencyLocal(result.value.weeklyWithdrawal)}`)
  lines.push(`- **${isEnglish ? 'Daily' : '每日'}**: ${formatCurrencyLocal(result.value.dailyWithdrawal)}`)
  lines.push('')

  // Yearly Projection (first 10 years)
  lines.push(isEnglish ? '## Yearly Projection (First 10 Years)' : (isTraditional ? '## 年度成長預測（前10年）' : '## 年度成长预测（前10年）'))
  lines.push('')
  lines.push(`| ${isEnglish ? 'Year' : '年份'} | ${isEnglish ? 'Starting' : '期初'} | ${isEnglish ? 'Contribution' : '投入'} | ${isEnglish ? 'Returns' : '報酬'} | ${isEnglish ? 'Ending' : '期末'} |`)
  lines.push('|------|----------|----------|----------|----------|')

  for (const year of result.value.yearlyProjection.slice(0, 10)) {
    const yearLabel = isEnglish ? `Year ${year.year}` : `第 ${year.year} 年`
    const freedTag = year.isFreed ? (isEnglish ? ' ✅' : ' ✅') : ''
    lines.push(`| ${yearLabel}${freedTag} | ${formatCurrencyLocal(year.startingAssets)} | +${formatCurrencyLocal(year.contribution)} | ${year.returns >= 0 ? '+' : ''}${formatCurrencyLocal(year.returns)} | ${formatCurrencyLocal(year.endingAssets)} |`)
  }
  lines.push('')

  // Footer
  lines.push('---')
  lines.push(`*${isEnglish ? 'Generated by Financial Freedom Calculator' : '由財務自由計算機產生'}*`)

  const markdown = lines.join('\n')

  try {
    await navigator.clipboard.writeText(markdown)
    copySuccess.value = true
    toast.success(t('tools.financialFreedom.copySuccess'))
    setTimeout(() => {
      copySuccess.value = false
    }, 2000)
  } catch (err) {
    toast.error(t('tools.financialFreedom.copyFailed'))
  }
}

// SEO
useHead({
  title: '財務自由計算機 - 投資工具',
  meta: [
    { name: 'description', content: '計算您的財務自由金額（FIRE Number），了解目前進度與達成時間。支援多種提領率設定，幫助您規劃財務自由之路。' }
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
        {{ t('tools.financialFreedom.title') }}
      </h1>
      <p class="text-gray-600 dark:text-gray-400">
        {{ t('tools.financialFreedom.subtitle') }}
      </p>
    </div>

    <!-- Input Section -->
    <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
      <h2 class="text-lg font-semibold text-gray-900 dark:text-white mb-4">
        {{ t('tools.financialFreedom.inputParams') }}
      </h2>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
        <!-- Annual Expenses -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ t('tools.financialFreedom.annualExpenses') }}
          </label>
          <div class="relative">
            <input
              v-model.number="annualExpenses"
              type="number"
              min="0"
              step="10000"
              :placeholder="t('tools.financialFreedom.annualExpensesPlaceholder')"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <span class="absolute right-3 top-2 text-gray-500 dark:text-gray-400 text-sm">$/年</span>
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ t('tools.financialFreedom.annualExpensesHint') }}
          </p>
        </div>

        <!-- Current Assets -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ t('tools.financialFreedom.currentAssets') }}
          </label>
          <div class="relative">
            <input
              v-model.number="currentAssets"
              type="number"
              min="0"
              step="100000"
              :placeholder="t('tools.financialFreedom.currentAssetsPlaceholder')"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <span class="absolute right-3 top-2 text-gray-500 dark:text-gray-400 text-sm">$</span>
          </div>
        </div>

        <!-- Monthly Contribution -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ t('tools.financialFreedom.monthlyContribution') }}
          </label>
          <div class="relative">
            <input
              v-model.number="monthlyContribution"
              type="number"
              min="0"
              step="5000"
              :placeholder="t('tools.financialFreedom.monthlyContributionPlaceholder')"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <span class="absolute right-3 top-2 text-gray-500 dark:text-gray-400 text-sm">$/月</span>
          </div>
        </div>

        <!-- Expected Return -->
        <div>
          <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            {{ t('tools.financialFreedom.expectedReturn') }}
          </label>
          <div class="relative">
            <input
              v-model.number="expectedReturn"
              type="number"
              min="0"
              max="30"
              step="0.5"
              class="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-white"
            />
            <span class="absolute right-3 top-2 text-gray-500 dark:text-gray-400 text-sm">%</span>
          </div>
          <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
            {{ t('tools.financialFreedom.expectedReturnHint') }}
          </p>
        </div>
      </div>

      <!-- Withdrawal Rate Selection -->
      <div class="mt-6">
        <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {{ t('tools.financialFreedom.withdrawalRate') }}
        </label>
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <button
            v-for="preset in withdrawalRatePresets"
            :key="preset.id"
            @click="withdrawalRatePreset = preset.id"
            class="px-4 py-3 text-sm font-medium rounded-lg border-2 transition-all"
            :class="withdrawalRatePreset === preset.id
              ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
              : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500 text-gray-700 dark:text-gray-300'"
          >
            <div class="font-semibold">{{ getPresetName(preset) }}</div>
            <div class="text-xs opacity-70 mt-1">{{ preset.rate }}%</div>
          </button>
        </div>
        <p class="mt-2 text-sm text-gray-500 dark:text-gray-400">
          {{ t(`tools.financialFreedom.withdrawalPresets.${withdrawalRatePreset}.description`) }}
        </p>
      </div>
    </div>

    <!-- Results Section -->
    <div v-if="isValidInput && result" class="space-y-6">
      <!-- FIRE Number Card -->
      <div class="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
        <div class="text-center">
          <h3 class="text-lg font-medium opacity-80 mb-2">
            {{ t('tools.financialFreedom.fireNumber') }}
          </h3>
          <div class="text-4xl font-bold mb-4">
            {{ formatCurrencyLocal(result.fireNumber) }}
          </div>

          <!-- Progress Bar -->
          <div class="w-full bg-white/20 rounded-full h-4 mb-2 overflow-hidden">
            <div
              class="h-full transition-all duration-500"
              :class="progressColor"
              :style="{ width: `${Math.min(100, result.currentProgress)}%` }"
            />
          </div>
          <div class="text-sm opacity-90">
            {{ t('tools.financialFreedom.progress', { percent: result.currentProgress.toFixed(1) }) }}
          </div>
        </div>
      </div>

      <!-- Summary Cards -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <!-- Amount Needed -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('tools.financialFreedom.amountNeeded') }}
          </div>
          <div class="text-xl font-bold text-gray-900 dark:text-white">
            {{ formatCurrencyLocal(result.amountNeeded) }}
          </div>
        </div>

        <!-- Years to Freedom -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('tools.financialFreedom.yearsToFreedom') }}
          </div>
          <div class="text-xl font-bold" :class="result.yearsToFreedom === 0 ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-white'">
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

        <!-- Freedom Date -->
        <div class="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <div class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('tools.financialFreedom.freedomDate') }}
          </div>
          <div class="text-xl font-bold text-gray-900 dark:text-white">
            <template v-if="result.yearsToFreedom === 0">
              {{ t('tools.financialFreedom.now') }}
            </template>
            <template v-else-if="result.freedomDate">
              {{ formatDate(result.freedomDate, locale) }}
            </template>
          </div>
        </div>
      </div>

      <!-- Withdrawal Capacity -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('tools.financialFreedom.withdrawalCapacity') }}
          </h3>
          <span class="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium">
            {{ formatPercent(withdrawalRate) }}
          </span>
        </div>

        <div class="grid grid-cols-3 gap-4">
          <div class="text-center">
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {{ t('tools.financialFreedom.monthly') }}
            </div>
            <div class="text-lg font-bold text-green-600 dark:text-green-400">
              {{ formatCurrencyLocal(result.monthlyWithdrawal) }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {{ t('tools.financialFreedom.weekly') }}
            </div>
            <div class="text-lg font-bold text-blue-600 dark:text-blue-400">
              {{ formatCurrencyLocal(result.weeklyWithdrawal) }}
            </div>
          </div>
          <div class="text-center">
            <div class="text-sm text-gray-500 dark:text-gray-400 mb-1">
              {{ t('tools.financialFreedom.daily') }}
            </div>
            <div class="text-lg font-bold text-purple-600 dark:text-purple-400">
              {{ formatCurrencyLocal(result.dailyWithdrawal) }}
            </div>
          </div>
        </div>
      </div>

      <!-- Yearly Projection -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
        <div class="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <h3 class="text-lg font-semibold text-gray-900 dark:text-white">
            {{ t('tools.financialFreedom.yearlyProjection') }}
          </h3>
          <button
            @click="copyToClipboard"
            class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-lg transition-all bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            <Icon
              :name="copySuccess ? 'heroicons:check' : 'heroicons:clipboard-document'"
              class="w-4 h-4 mr-1"
            />
            {{ copySuccess ? t('common.copied') : t('common.copy') }}
          </button>
        </div>

        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <th class="text-left py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  {{ t('tools.financialFreedom.year') }}
                </th>
                <th class="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  {{ t('tools.financialFreedom.startingAssets') }}
                </th>
                <th class="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  {{ t('tools.financialFreedom.contribution') }}
                </th>
                <th class="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  {{ t('tools.financialFreedom.returns') }}
                </th>
                <th class="text-right py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                  {{ t('tools.financialFreedom.endingAssets') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(year, index) in result.yearlyProjection.slice(0, 20)"
                :key="index"
                class="border-b border-gray-100 dark:border-gray-700/50"
                :class="{
                  'bg-green-50 dark:bg-green-900/20': year.isFreed,
                  'bg-indigo-50 dark:bg-indigo-900/20': index === 0
                }"
              >
                <td class="py-3 px-4 font-medium text-gray-900 dark:text-white">
                  {{ t('tools.financialFreedom.yearN', { n: year.year }) }}
                  <span v-if="year.isFreed" class="ml-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full">
                    {{ t('tools.financialFreedom.freed') }}
                  </span>
                </td>
                <td class="py-3 px-4 text-right text-gray-600 dark:text-gray-400">
                  {{ formatCurrencyLocal(year.startingAssets) }}
                </td>
                <td class="py-3 px-4 text-right text-green-600 dark:text-green-400">
                  +{{ formatCurrencyLocal(year.contribution) }}
                </td>
                <td class="py-3 px-4 text-right" :class="year.returns >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-red-600 dark:text-red-400'">
                  {{ year.returns >= 0 ? '+' : '' }}{{ formatCurrencyLocal(year.returns) }}
                </td>
                <td class="py-3 px-4 text-right font-medium text-gray-900 dark:text-white">
                  {{ formatCurrencyLocal(year.endingAssets) }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Recommendation -->
      <div class="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
        <div class="flex items-start gap-3">
          <Icon name="heroicons:light-bulb" class="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
          <div class="text-sm text-amber-800 dark:text-amber-200 whitespace-pre-line">
            {{ result.recommendation }}
          </div>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div v-else class="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-12 text-center">
      <Icon name="heroicons:calculator" class="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
      <p class="text-gray-500 dark:text-gray-400">
        {{ t('tools.financialFreedom.emptyState') }}
      </p>
    </div>

    <!-- Info Cards -->
    <div class="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
      <!-- What is FIRE Number -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {{ t('tools.financialFreedom.whatIsFireNumber') }}
        </h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ t('tools.financialFreedom.whatIsFireNumberDesc') }}
        </p>
      </div>

      <!-- About Withdrawal Rate -->
      <div class="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
        <h3 class="text-lg font-semibold text-gray-900 dark:text-white mb-3">
          {{ t('tools.financialFreedom.aboutWithdrawalRate') }}
        </h3>
        <p class="text-gray-600 dark:text-gray-400 text-sm">
          {{ t('tools.financialFreedom.aboutWithdrawalRateDesc') }}
        </p>
      </div>
    </div>

    <!-- Privacy Note -->
    <div class="mt-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
      <p class="text-sm text-green-700 dark:text-green-300 text-center">
        {{ t('tools.financialFreedom.privacyNote') }}
      </p>
    </div>

    <!-- Disclaimer -->
    <div class="mt-4 bg-gray-100 dark:bg-gray-800 rounded-lg p-4">
      <p class="text-xs text-gray-500 dark:text-gray-400 text-center">
        {{ t('tools.financialFreedom.disclaimer') }}
      </p>
    </div>
  </div>
</template>
