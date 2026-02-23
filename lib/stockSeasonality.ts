/**
 * Stock Seasonality Analyzer
 * 美股月份季節性分析工具
 * 基於1950年至今的歷史數據統計
 */

export type VolatilityLevel = 'low' | 'low-medium' | 'medium' | 'medium-high' | 'high'

export type MonthStrength = 'weakest' | 'weak' | 'neutral' | 'strong' | 'strongest'

export interface MonthData {
  month: number // 1-12
  avgReturn: number // 平均回報百分比
  characteristicsKey: string // i18n key for主要特性
  volatility: VolatilityLevel
  possibleReasonsKeys: string[] // i18n keys for可能原因
}

export interface SeasonalityPeriod {
  nameKey: string // i18n key
  months: number[]
  avgReturn: number
  descriptionKey: string // i18n key
  strategyKey: string // i18n key
}

export interface SeasonalityAnalysis {
  currentMonth: MonthData | null
  bestMonths: MonthData[]
  worstMonths: MonthData[]
  strongPeriod: SeasonalityPeriod
  weakPeriod: SeasonalityPeriod
}

// 1950年至今的月份季節性數據
export const monthlyData: MonthData[] = [
  {
    month: 1,
    avgReturn: 1.07,
    characteristicsKey: 'tools.seasonality.months.jan.characteristics',
    volatility: 'medium',
    possibleReasonsKeys: [
      'tools.seasonality.months.jan.reasons.0',
      'tools.seasonality.months.jan.reasons.1',
      'tools.seasonality.months.jan.reasons.2'
    ]
  },
  {
    month: 2,
    avgReturn: -0.01,
    characteristicsKey: 'tools.seasonality.months.feb.characteristics',
    volatility: 'medium-high',
    possibleReasonsKeys: [
      'tools.seasonality.months.feb.reasons.0',
      'tools.seasonality.months.feb.reasons.1',
      'tools.seasonality.months.feb.reasons.2'
    ]
  },
  {
    month: 3,
    avgReturn: 1.13,
    characteristicsKey: 'tools.seasonality.months.mar.characteristics',
    volatility: 'medium',
    possibleReasonsKeys: [
      'tools.seasonality.months.mar.reasons.0',
      'tools.seasonality.months.mar.reasons.1'
    ]
  },
  {
    month: 4,
    avgReturn: 1.46,
    characteristicsKey: 'tools.seasonality.months.apr.characteristics',
    volatility: 'medium',
    possibleReasonsKeys: [
      'tools.seasonality.months.apr.reasons.0',
      'tools.seasonality.months.apr.reasons.1'
    ]
  },
  {
    month: 5,
    avgReturn: 0.30,
    characteristicsKey: 'tools.seasonality.months.may.characteristics',
    volatility: 'low-medium',
    possibleReasonsKeys: [
      'tools.seasonality.months.may.reasons.0',
      'tools.seasonality.months.may.reasons.1'
    ]
  },
  {
    month: 6,
    avgReturn: 0.11,
    characteristicsKey: 'tools.seasonality.months.jun.characteristics',
    volatility: 'low',
    possibleReasonsKeys: [
      'tools.seasonality.months.jun.reasons.0',
      'tools.seasonality.months.jun.reasons.1',
      'tools.seasonality.months.jun.reasons.2'
    ]
  },
  {
    month: 7,
    avgReturn: 1.28,
    characteristicsKey: 'tools.seasonality.months.jul.characteristics',
    volatility: 'low',
    possibleReasonsKeys: [
      'tools.seasonality.months.jul.reasons.0',
      'tools.seasonality.months.jul.reasons.1'
    ]
  },
  {
    month: 8,
    avgReturn: -0.01,
    characteristicsKey: 'tools.seasonality.months.aug.characteristics',
    volatility: 'low',
    possibleReasonsKeys: [
      'tools.seasonality.months.aug.reasons.0',
      'tools.seasonality.months.aug.reasons.1'
    ]
  },
  {
    month: 9,
    avgReturn: -0.72,
    characteristicsKey: 'tools.seasonality.months.sep.characteristics',
    volatility: 'high',
    possibleReasonsKeys: [
      'tools.seasonality.months.sep.reasons.0',
      'tools.seasonality.months.sep.reasons.1',
      'tools.seasonality.months.sep.reasons.2'
    ]
  },
  {
    month: 10,
    avgReturn: 0.91,
    characteristicsKey: 'tools.seasonality.months.oct.characteristics',
    volatility: 'high',
    possibleReasonsKeys: [
      'tools.seasonality.months.oct.reasons.0',
      'tools.seasonality.months.oct.reasons.1',
      'tools.seasonality.months.oct.reasons.2'
    ]
  },
  {
    month: 11,
    avgReturn: 1.82,
    characteristicsKey: 'tools.seasonality.months.nov.characteristics',
    volatility: 'medium',
    possibleReasonsKeys: [
      'tools.seasonality.months.nov.reasons.0',
      'tools.seasonality.months.nov.reasons.1',
      'tools.seasonality.months.nov.reasons.2'
    ]
  },
  {
    month: 12,
    avgReturn: 1.49,
    characteristicsKey: 'tools.seasonality.months.dec.characteristics',
    volatility: 'medium',
    possibleReasonsKeys: [
      'tools.seasonality.months.dec.reasons.0',
      'tools.seasonality.months.dec.reasons.1',
      'tools.seasonality.months.dec.reasons.2',
      'tools.seasonality.months.dec.reasons.3'
    ]
  }
]

// 強勢期與弱勢期定義
export const strongPeriod: SeasonalityPeriod = {
  nameKey: 'tools.seasonality.strongPeriod.name',
  months: [11, 12, 1, 2, 3, 4],
  avgReturn: 0.0, // 需要計算
  descriptionKey: 'tools.seasonality.strongPeriod.description',
  strategyKey: 'tools.seasonality.strongPeriod.strategy'
}

export const weakPeriod: SeasonalityPeriod = {
  nameKey: 'tools.seasonality.weakPeriod.name',
  months: [5, 6, 7, 8, 9, 10],
  avgReturn: 0.0, // 需要計算
  descriptionKey: 'tools.seasonality.weakPeriod.description',
  strategyKey: 'tools.seasonality.weakPeriod.strategy'
}

/**
 * 取得月份名稱
 */
export function getMonthName(month: number, locale: string = 'zh-TW'): string {
  const monthNames: Record<string, string[]> = {
    'zh-TW': ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    'zh-CN': ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
    'en': ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
  }
  const names = monthNames[locale] ?? monthNames['en']!
  return names[month - 1] ?? String(month)
}

/**
 * 取得月份簡稱
 */
export function getMonthShortName(month: number, locale: string = 'zh-TW'): string {
  const monthNames: Record<string, string[]> = {
    'zh-TW': ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    'zh-CN': ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
    'en': ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  }
  const names = monthNames[locale] ?? monthNames['en']!
  return names[month - 1] ?? String(month)
}

/**
 * 取得波動性等級文字
 */
export function getVolatilityLabel(volatility: VolatilityLevel, locale: string = 'zh-TW'): string {
  const labels: Record<string, Record<VolatilityLevel, string>> = {
    'zh-TW': {
      'low': '低',
      'low-medium': '中低',
      'medium': '中等',
      'medium-high': '中高',
      'high': '高'
    },
    'zh-CN': {
      'low': '低',
      'low-medium': '中低',
      'medium': '中等',
      'medium-high': '中高',
      'high': '高'
    },
    'en': {
      'low': 'Low',
      'low-medium': 'Low-Medium',
      'medium': 'Medium',
      'medium-high': 'Medium-High',
      'high': 'High'
    }
  }
  const localeLabels = labels[locale] ?? labels['en']!
  return localeLabels[volatility]
}

/**
 * 取得月份強度等級
 */
export function getMonthStrength(avgReturn: number): MonthStrength {
  if (avgReturn >= 1.5) return 'strongest'
  if (avgReturn >= 0.8) return 'strong'
  if (avgReturn >= 0) return 'neutral'
  if (avgReturn >= -0.3) return 'weak'
  return 'weakest'
}

/**
 * 取得強度標籤
 */
export function getStrengthLabel(strength: MonthStrength, locale: string = 'zh-TW'): string {
  const labels: Record<string, Record<MonthStrength, string>> = {
    'zh-TW': {
      'strongest': '最強',
      'strong': '強勢',
      'neutral': '中性',
      'weak': '弱勢',
      'weakest': '最弱'
    },
    'zh-CN': {
      'strongest': '最强',
      'strong': '强势',
      'neutral': '中性',
      'weak': '弱势',
      'weakest': '最弱'
    },
    'en': {
      'strongest': 'Strongest',
      'strong': 'Strong',
      'neutral': 'Neutral',
      'weak': 'Weak',
      'weakest': 'Weakest'
    }
  }
  const localeLabels = labels[locale] ?? labels['en']!
  return localeLabels[strength]
}

/**
 * 取得特定月份資料
 */
export function getMonthData(month: number): MonthData | null {
  return monthlyData.find(m => m.month === month) ?? null
}

/**
 * 取得當前月份資料
 */
export function getCurrentMonthData(): MonthData {
  const currentMonth = new Date().getMonth() + 1
  return getMonthData(currentMonth) ?? monthlyData[0]!
}

/**
 * 計算期間平均回報
 */
export function calculatePeriodAvgReturn(months: number[]): number {
  const relevantData = monthlyData.filter(m => months.includes(m.month))
  const totalReturn = relevantData.reduce((sum, m) => sum + m.avgReturn, 0)
  return totalReturn
}

/**
 * 取得最佳月份（前3名）
 */
export function getBestMonths(count: number = 3): MonthData[] {
  return [...monthlyData]
    .sort((a, b) => b.avgReturn - a.avgReturn)
    .slice(0, count)
}

/**
 * 取得最差月份（後3名）
 */
export function getWorstMonths(count: number = 3): MonthData[] {
  return [...monthlyData]
    .sort((a, b) => a.avgReturn - b.avgReturn)
    .slice(0, count)
}

/**
 * 格式化回報百分比
 */
export function formatReturn(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

/**
 * 取得回報顏色類別
 */
export function getReturnColorClass(value: number): string {
  if (value >= 1.0) return 'text-green-600 dark:text-green-400'
  if (value >= 0.3) return 'text-green-500 dark:text-green-500'
  if (value >= 0) return 'text-gray-500 dark:text-gray-400'
  if (value >= -0.3) return 'text-orange-500 dark:text-orange-400'
  return 'text-red-600 dark:text-red-400'
}

/**
 * 取得波動性顏色類別
 */
export function getVolatilityColorClass(volatility: VolatilityLevel): string {
  const colorMap: Record<VolatilityLevel, string> = {
    'low': 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300',
    'low-medium': 'bg-lime-100 dark:bg-lime-900/30 text-lime-700 dark:text-lime-300',
    'medium': 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300',
    'medium-high': 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300',
    'high': 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
  }
  return colorMap[volatility]
}

/**
 * 完整季節性分析
 */
export function analyzeSeasonality(): SeasonalityAnalysis {
  const currentMonth = getCurrentMonthData()
  const bestMonths = getBestMonths(3)
  const worstMonths = getWorstMonths(3)
  
  const strongPeriodWithReturn: SeasonalityPeriod = {
    ...strongPeriod,
    avgReturn: calculatePeriodAvgReturn(strongPeriod.months)
  }
  
  const weakPeriodWithReturn: SeasonalityPeriod = {
    ...weakPeriod,
    avgReturn: calculatePeriodAvgReturn(weakPeriod.months)
  }
  
  return {
    currentMonth,
    bestMonths,
    worstMonths,
    strongPeriod: strongPeriodWithReturn,
    weakPeriod: weakPeriodWithReturn
  }
}
