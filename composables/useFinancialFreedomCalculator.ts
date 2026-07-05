import { ref, computed } from 'vue'
import {
  calculateFinancialFreedom,
  withdrawalRatePresets,
  type WithdrawalRatePreset
} from '~/lib/financialFreedom'

export interface FinancialFreedomInput {
  annualExpenses: number | null
  currentAssets: number | null
  monthlyContribution: number | null
  expectedReturn: number
  withdrawalRatePreset: WithdrawalRatePreset
  customWithdrawalRate: number
  inflationRate: number
  currentAge: number | null
}

export function useFinancialFreedomCalculator(initial?: Partial<FinancialFreedomInput>) {
  // State
  const annualExpenses = ref<number | null>(initial?.annualExpenses ?? 600000)
  const currentAssets = ref<number | null>(initial?.currentAssets ?? 1000000)
  const monthlyContribution = ref<number | null>(initial?.monthlyContribution ?? 20000)
  const expectedReturn = ref<number>(initial?.expectedReturn ?? 8)
  const withdrawalRatePreset = ref<WithdrawalRatePreset>(initial?.withdrawalRatePreset ?? 'moderate')
  const customWithdrawalRate = ref<number>(initial?.customWithdrawalRate ?? 4)
  const inflationRate = ref<number>(initial?.inflationRate ?? 2)
  // 預設 30 維持歷史行為；User schema 沒 age/birthDate，由 page local state 提供
  const currentAge = ref<number | null>(initial?.currentAge ?? 30)

  // Computed: Return rate level
  const returnRateLevel = computed(() => {
    const rate = expectedReturn.value
    if (rate <= 4) return 'conservative'
    if (rate <= 10) return 'target'
    return 'expert'
  })

  // Computed: Return rate indicator for UI
  const returnRateIndicator = computed(() => {
    const levels = ['conservative', 'target', 'expert'] as const
    const currentIndex = levels.indexOf(returnRateLevel.value)

    return levels.map((level, index) => {
      const isActive = index === currentIndex
      const isPast = index < currentIndex

      let colorClass: string = ''
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

  // Computed: Withdrawal rate from preset or custom
  const withdrawalRate = computed(() => {
    const preset = withdrawalRatePresets.find(p => p.id === withdrawalRatePreset.value)
    return preset?.rate ?? customWithdrawalRate.value
  })

  // Computed: Input validation
  const isValidInput = computed(() =>
    annualExpenses.value !== null &&
    annualExpenses.value > 0 &&
    currentAssets.value !== null &&
    currentAssets.value >= 0 &&
    monthlyContribution.value !== null &&
    monthlyContribution.value >= 0
  )

  // Computed: Calculation result
  const result = computed(() => {
    if (!isValidInput.value) return null

    return calculateFinancialFreedom({
      annualExpenses: annualExpenses.value!,
      currentAssets: currentAssets.value!,
      monthlyContribution: monthlyContribution.value!,
      expectedReturn: expectedReturn.value,
      withdrawalRate: withdrawalRate.value,
      inflationRate: inflationRate.value,
      yearsToRetirement: null,
      currentAge: currentAge.value
    })
  })

  // Computed: Progress color for UI
  const progressColor = computed(() => {
    const progress = result.value?.currentProgress ?? 0
    if (progress >= 75) return 'bg-green-500'
    if (progress >= 50) return 'bg-blue-500'
    if (progress >= 25) return 'bg-amber-500'
    return 'bg-gray-400'
  })

  // Actions
  const setInput = (key: keyof FinancialFreedomInput, value: any) => {
    switch (key) {
      case 'annualExpenses':
        annualExpenses.value = value
        break
      case 'currentAssets':
        currentAssets.value = value
        break
      case 'monthlyContribution':
        monthlyContribution.value = value
        break
      case 'expectedReturn':
        expectedReturn.value = value
        break
      case 'withdrawalRatePreset':
        withdrawalRatePreset.value = value
        break
      case 'customWithdrawalRate':
        customWithdrawalRate.value = value
        break
      case 'inflationRate':
        inflationRate.value = value
        break
      case 'currentAge':
        currentAge.value = value
        break
    }
  }

  const reset = () => {
    annualExpenses.value = 600000
    currentAssets.value = 1000000
    monthlyContribution.value = 20000
    expectedReturn.value = 8
    withdrawalRatePreset.value = 'moderate'
    customWithdrawalRate.value = 4
    inflationRate.value = 2
    currentAge.value = 30
  }

  return {
    // State
    annualExpenses,
    currentAssets,
    monthlyContribution,
    expectedReturn,
    withdrawalRatePreset,
    customWithdrawalRate,
    inflationRate,
    currentAge,
    copySuccess: ref(false),

    // Computed
    returnRateLevel,
    returnRateIndicator,
    withdrawalRate,
    isValidInput,
    result,
    progressColor,

    // Actions
    setInput,
    reset
  }
}
