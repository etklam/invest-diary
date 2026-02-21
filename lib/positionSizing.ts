/**
 * Position Sizing Calculator
 * 純計算函式，與 UI 框架無關，方便測試與重用
 */

export type RoundingMode = 'down' | 'nearest' | 'up'

export interface Strategy {
  id: string
  name: string
  ratios: number[]
  description: string
  pros: string[]
  cons: string[]
}

export interface PositionResult {
  ratio: number
  amount: number
  shares: number
  actualAmount: number
  cumulativeShares: number
  cumulativeAmount: number
}

export interface CalculationSummary {
  totalShares: number
  totalInvested: number
  avgPrice: number
  reservedCash: number        // 策略性保留（使用者指定百分比）
  unallocatedCash: number     // 技術性剩餘（因整股限制無法投入）
  totalRemainingCash: number  // 總剩餘 = reserved + unallocated
  utilizationRate: number     // 實際投入 / 總資金
  isOverBudget: boolean       // 因進位導致超額
  overBudgetAmount: number    // 超額金額
}

export interface CalculationInput {
  capital: number
  stockPrice: number
  ratios: number[]
  reserveCashPercent: number
  roundingMode: RoundingMode
}

/**
 * 驗證策略比例總和
 * @returns 總和百分比與是否為 100%
 */
export function validateRatios(ratios: number[]): { sum: number; isValid: boolean } {
  const sum = ratios.reduce((acc, r) => acc + r, 0)
  // 允許極小浮點誤差
  const isValid = Math.abs(sum - 100) < 0.01
  return { sum, isValid }
}

/**
 * 計算單一批次的股數
 */
function calculateShares(amount: number, price: number, mode: RoundingMode): number {
  if (price <= 0) return 0
  
  let shares: number
  switch (mode) {
    case 'down':
      shares = Math.floor(amount / price)
      break
    case 'up':
      shares = Math.ceil(amount / price)
      break
    case 'nearest':
      shares = Math.round(amount / price)
      break
  }
  
  return Math.max(0, shares)
}

/**
 * 核心計算函式：分批建倉
 */
export function calculatePositionSizing(input: CalculationInput): {
  results: PositionResult[]
  summary: CalculationSummary | null
  warnings: string[]
} {
  const { capital, stockPrice, ratios, reserveCashPercent, roundingMode } = input
  const warnings: string[] = []
  
  // 基本驗證
  if (capital <= 0 || stockPrice <= 0) {
    return { results: [], summary: null, warnings: ['無效的資金或股價'] }
  }
  
  // 比例驗證
  const { sum: ratiosSum, isValid: ratiosValid } = validateRatios(ratios)
  if (!ratiosValid) {
    warnings.push(`策略比例總和為 ${ratiosSum.toFixed(1)}%，非 100%`)
  }
  
  // 計算可用資金（扣除策略性保留）
  const reservedCash = capital * (reserveCashPercent / 100)
  const availableCapital = capital - reservedCash
  
  // 計算各批次
  const results: PositionResult[] = []
  let cumulativeShares = 0
  let cumulativeAmount = 0
  
  for (let i = 0; i < ratios.length; i++) {
    const ratio = ratios[i]!
    const amount = (availableCapital * ratio) / 100
    
    // 計算股數
    let shares = calculateShares(amount, stockPrice, roundingMode)
    
    // 最後一批：若 roundingMode = up，需確保不超過可用資金
    const isLastBatch = i === ratios.length - 1
    if (isLastBatch && roundingMode === 'up') {
      const maxShares = Math.floor((availableCapital - cumulativeAmount) / stockPrice)
      if (shares > maxShares && maxShares >= 0) {
        shares = maxShares
        warnings.push('最後一批已調整股數以避免超額投入')
      }
    }
    
    const actualAmount = shares * stockPrice
    
    cumulativeShares += shares
    cumulativeAmount += actualAmount
    
    results.push({
      ratio,
      amount,
      shares,
      actualAmount,
      cumulativeShares,
      cumulativeAmount
    })
  }
  
  // 計算摘要
  const totalShares = cumulativeShares
  const totalInvested = cumulativeAmount
  const avgPrice = totalShares > 0 ? totalInvested / totalShares : 0
  
  // 檢查是否超額（roundingMode = up 可能導致）
  const isOverBudget = totalInvested > availableCapital
  const overBudgetAmount = isOverBudget ? totalInvested - availableCapital : 0
  
  // 計算各種剩餘現金
  const unallocatedCash = Math.max(0, availableCapital - totalInvested)
  const totalRemainingCash = reservedCash + unallocatedCash
  
  // 資金不足以買 1 股的警告
  if (stockPrice > availableCapital) {
    warnings.push('股價過高，可用資金不足以買入 1 股')
  } else if (totalShares === 0) {
    warnings.push('資金不足以在任何批次買入 1 股')
  }
  
  const summary: CalculationSummary = {
    totalShares,
    totalInvested,
    avgPrice,
    reservedCash,
    unallocatedCash,
    totalRemainingCash,
    utilizationRate: (totalInvested / capital) * 100,
    isOverBudget,
    overBudgetAmount
  }
  
  return { results, summary, warnings }
}

/**
 * 格式化貨幣（與頁面一致）
 */
export function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(value)
}

/**
 * 格式化數字（與頁面一致）
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat('zh-TW').format(value)
}
