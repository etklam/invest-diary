/**
 * Financial Freedom Calculator
 * 財富自由計算機
 * 純計算函式，與 UI 框架無關
 */

export type WithdrawalRatePreset = 'conservative' | 'moderate' | 'aggressive'

export interface WithdrawalRateOption {
  id: WithdrawalRatePreset
  name: string
  rate: number
  description: string
  risk: 'low' | 'medium' | 'high'
}

export interface FinancialFreedomInput {
  annualExpenses: number // 年度支出
  currentAssets: number // 目前資產
  monthlyContribution: number // 每月投入
  expectedReturn: number // 預期年化報酬率
  withdrawalRate: number // 提領率 (%)
  inflationRate: number // 通膨率 (%)
  yearsToRetirement: number | null // 預計幾年後退休 (null = 計算所需年數)
  // 目前年齡，僅用於 yearlyProjection.age 顯示；null 表示不顯示年齡
  // ponytail: 不再焊死 30，由 caller 傳入（composable 預設 30 維持歷史行為）
  currentAge?: number | null
}

export interface FinancialFreedomResult {
  // 財務自由金額
  fireNumber: number
  currentProgress: number // 目前進度百分比
  amountNeeded: number // 還需要多少錢

  // 時間計算
  yearsToFreedom: number | null // 幾年後可達財務自由
  freedomDate: Date | null // 預計達成日期

  // 每年成長預測
  yearlyProjection: YearlyProjection[]

  // 每月可用金額（達成後）
  monthlyWithdrawal: number
  weeklyWithdrawal: number
  dailyWithdrawal: number

  // 安全邊際
  safeWithdrawalRate: number
  recommendation: string
}

export interface YearlyProjection {
  year: number
  age: number | null
  startingAssets: number
  contribution: number
  returns: number
  endingAssets: number
  isFreed: boolean
}

// 預設提領率選項
export const withdrawalRatePresets: WithdrawalRateOption[] = [
  {
    id: 'conservative',
    name: '保守型 (3%)',
    rate: 3,
    description: '適合保守型投資人，資產使用壽命極長',
    risk: 'low'
  },
  {
    id: 'moderate',
    name: '穩健型 (4%)',
    rate: 4,
    description: '傳統 4% 法則，平衡風險與收益',
    risk: 'medium'
  },
  {
    id: 'aggressive',
    name: '積極型 (5%)',
    rate: 5,
    description: '較高提領率，資產可能較早耗盡',
    risk: 'high'
  }
]

/**
 * 計算財務自由金額 (FIRE Number)
 */
export function calculateFireNumber(annualExpenses: number, withdrawalRate: number): number {
  if (withdrawalRate <= 0) return 0
  return (annualExpenses * 100) / withdrawalRate
}

/**
 * 計算目前進度百分比
 */
export function calculateProgress(currentAssets: number, fireNumber: number): number {
  if (fireNumber <= 0) return 0
  return Math.min(100, (currentAssets / fireNumber) * 100)
}

/**
 * 計算複利成長
 */
export function calculateCompoundGrowth(
  principal: number,
  monthlyContribution: number,
  annualRate: number,
  years: number
): number {
  if (years <= 0) return principal

  const monthlyRate = annualRate / 100 / 12
  const months = years * 12

  let amount = principal
  for (let i = 0; i < months; i++) {
    amount = amount * (1 + monthlyRate) + monthlyContribution
  }

  return amount
}

/**
 * 計算達成財務自由需要的年數
 */
export function calculateYearsToFreedom(
  currentAssets: number,
  fireNumber: number,
  monthlyContribution: number,
  expectedReturn: number
): number | null {
  if (currentAssets >= fireNumber) return 0

  // 二分搜尋找年數
  let minYears = 0
  let maxYears = 100
  let result: number | null = null

  for (let i = 0; i < 100; i++) {
    const midYears = (minYears + maxYears) / 2
    const projected = calculateCompoundGrowth(currentAssets, monthlyContribution, expectedReturn, midYears)

    if (projected >= fireNumber) {
      result = midYears
      maxYears = midYears
    } else {
      minYears = midYears
    }
  }

  return result
}

/**
 * 生成年度成長預測
 */
export function generateYearlyProjection(
  currentAssets: number,
  monthlyContribution: number,
  expectedReturn: number,
  fireNumber: number,
  currentAge: number | null,
  maxYears: number = 50
): YearlyProjection[] {
  const projection: YearlyProjection[] = []
  let assets = currentAssets
  const monthlyRate = expectedReturn / 100 / 12
  let freedomReached = false

  for (let year = 1; year <= maxYears; year++) {
    const startingAssets = assets

    // 計算當年貢獻與報酬
    let yearlyContribution = 0
    let yearlyReturns = 0

    for (let month = 0; month < 12; month++) {
      assets = assets * (1 + monthlyRate) + monthlyContribution
      yearlyContribution += monthlyContribution
    }

    yearlyReturns = assets - startingAssets - yearlyContribution

    // 檢查是否達成財務自由
    if (!freedomReached && assets >= fireNumber) {
      freedomReached = true
    }

    projection.push({
      year,
      age: currentAge !== null ? currentAge + year : null,
      startingAssets,
      contribution: yearlyContribution,
      returns: yearlyReturns,
      endingAssets: assets,
      isFreed: freedomReached
    })

    // 達成後再顯示5年
    if (freedomReached && year >= projection.findIndex(p => p.isFreed) + 5) {
      break
    }
  }

  return projection
}

/**
 * 估算每月可用金額
 */
export function calculateWithdrawalAmounts(fireNumber: number, withdrawalRate: number): {
  monthly: number
  weekly: number
  daily: number
} {
  const annual = fireNumber * (withdrawalRate / 100)
  return {
    monthly: annual / 12,
    weekly: annual / 52,
    daily: annual / 365
  }
}

/**
 * 產生建議
 */
export function generateRecommendation(
  progress: number,
  yearsToFreedom: number | null,
  withdrawalRate: number
): string {
  const recommendations: string[] = []

  if (progress >= 100) {
    recommendations.push('🎉 恭喜！您已達成財務自由！')
  } else if (progress >= 75) {
    recommendations.push('🔥 非常接近了！繼續保持目前的投入速度。')
  } else if (progress >= 50) {
    recommendations.push('💪 已經過半！距離目標越來越近。')
  } else if (progress >= 25) {
    recommendations.push('📈 良好的開始，持續投入是關鍵。')
  } else {
    recommendations.push('🌱 財務自由之旅從現在開始，每一步都很重要。')
  }

  if (withdrawalRate <= 3) {
    recommendations.push('您選擇保守型提領率，資產使用壽命較長，適合長期規劃。')
  } else if (withdrawalRate >= 5) {
    recommendations.push('您選擇積極型提領率，注意市場波動風險，建議保留更多緩衝。')
  }

  return recommendations.join('\n\n')
}

/**
 * 主要計算函式
 */
export function calculateFinancialFreedom(input: FinancialFreedomInput): FinancialFreedomResult {
  const {
    annualExpenses,
    currentAssets,
    monthlyContribution,
    expectedReturn,
    withdrawalRate
  } = input

  // 計算 FIRE Number
  const fireNumber = calculateFireNumber(annualExpenses, withdrawalRate)

  // 目前進度
  const currentProgress = calculateProgress(currentAssets, fireNumber)
  const amountNeeded = Math.max(0, fireNumber - currentAssets)

  // 計算需要的年數
  let yearsToFreedom: number | null = null
  let freedomDate: Date | null = null

  if (currentAssets < fireNumber) {
    yearsToFreedom = calculateYearsToFreedom(
      currentAssets,
      fireNumber,
      monthlyContribution,
      expectedReturn
    )

    if (yearsToFreedom !== null) {
      const now = new Date()
      freedomDate = new Date(now.getFullYear() + Math.floor(yearsToFreedom), now.getMonth(), now.getDate())
    }
  } else {
    yearsToFreedom = 0
    freedomDate = new Date()
  }

  // 生成年度預測；currentAge 由 caller 傳入（null 表示不顯示年齡）
  const yearlyProjection = generateYearlyProjection(
    currentAssets,
    monthlyContribution,
    expectedReturn,
    fireNumber,
    input.currentAge ?? null
  )

  // 計算提領金額
  const { monthly: monthlyWithdrawal, weekly: weeklyWithdrawal, daily: dailyWithdrawal } =
    calculateWithdrawalAmounts(fireNumber, withdrawalRate)

  // 產生建議
  const recommendation = generateRecommendation(currentProgress, yearsToFreedom, withdrawalRate)

  return {
    fireNumber,
    currentProgress,
    amountNeeded,
    yearsToFreedom,
    freedomDate,
    yearlyProjection,
    monthlyWithdrawal,
    weeklyWithdrawal,
    dailyWithdrawal,
    safeWithdrawalRate: withdrawalRate,
    recommendation
  }
}

// 格式化函數已移至 lib/format.ts 和 lib/dates/ — 請直接從該處 import

/**
 * 取得風險等級顏色
 */
export function getRiskColorClass(risk: string): string {
  const colorMap: Record<string, string> = {
    'low': 'text-green-600 dark:text-green-400',
    'medium': 'text-amber-600 dark:text-amber-400',
    'high': 'text-red-600 dark:text-red-400'
  }
  return colorMap[risk] || 'text-gray-600 dark:text-gray-400'
}

/**
 * 取得風險等級背景色
 */
export function getRiskBgClass(risk: string): string {
  const colorMap: Record<string, string> = {
    'low': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'medium': 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300',
    'high': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }
  return colorMap[risk] || 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
}
