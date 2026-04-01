/**
 * Relative Value Calculator
 * 純計算函式，與 UI 框架無關，方便測試與重用
 */

export interface PricePoint {
  targetPrice: number
  correspondingPrice: number
}

export interface CalculationInput {
  primarySymbol: string
  primaryPrice: number
  relativeSymbol: string
  relativePrice: number
  targetPrices: number[]
}

export interface CalculationResult {
  ratio: number
  inverseRatio: number
  priceTable: PricePoint[]
  primarySymbol: string
  relativeSymbol: string
}

export interface QuoteResponse {
  symbol: string
  regularMarketPrice: number
  previousClose: number
  change: number
  changePercent: number
  currency: string
  marketState: string
  lastUpdateTime: string
}

/**
 * 計算價格比率
 * @param primaryPrice 主股票價格
 * @param relativePrice 相對股票價格
 * @returns 比率（主股票 / 相對股票）
 */
export function calculateRatio(primaryPrice: number, relativePrice: number): number {
  if (relativePrice === 0) {
    throw new Error('Relative price cannot be zero')
  }
  return primaryPrice / relativePrice
}

/**
 * 根據比率計算對應價格
 * @param targetPrice 目標價格（主股票）
 * @param ratio 價格比率
 * @returns 對應價格（相對股票）
 */
export function calculateCorrespondingPrice(targetPrice: number, ratio: number): number {
  if (ratio === 0) {
    throw new Error('Ratio cannot be zero')
  }
  return targetPrice / ratio
}

/**
 * 批量計算對應價格
 * @param targetPrices 目標價格數組
 * @param ratio 價格比率
 * @returns 對應價格數組
 */
export function calculateCorrespondingPrices(targetPrices: number[], ratio: number): PricePoint[] {
  return targetPrices.map(targetPrice => ({
    targetPrice,
    correspondingPrice: calculateCorrespondingPrice(targetPrice, ratio)
  }))
}

/**
 * 生成定價單（等間隔價格點）
 * @param basePrice 基準價格
 * @param count 價格點數量
 * @param step 間隔
 * @param direction 方向：'up' 向上, 'down' 向下, 'both' 雙向
 * @returns 目標價格數組
 */
export function generatePricePoints(
  basePrice: number,
  count: number,
  step: number,
  direction: 'up' | 'down' | 'both' = 'both'
): number[] {
  if (basePrice <= 0 || count <= 0 || step <= 0) {
    return []
  }

  const prices: number[] = []

  if (direction === 'down' || direction === 'both') {
    for (let i = 1; i <= count; i++) {
      const nextPrice = basePrice - step * i
      if (nextPrice > 0) {
        prices.push(nextPrice)
      }
    }
  }

  if (direction === 'up' || direction === 'both') {
    for (let i = 1; i <= count; i++) {
      prices.push(basePrice + step * i)
    }
  }

  return prices.sort((a, b) => a - b)
}

/**
 * 核心計算函式
 */
export function calculateRelativeValue(input: CalculationInput): CalculationResult {
  const { primarySymbol, primaryPrice, relativeSymbol, relativePrice, targetPrices } = input

  // 計算比率
  const ratio = calculateRatio(primaryPrice, relativePrice)
  const inverseRatio = 1 / ratio

  // 計算對應價格表
  const priceTable = calculateCorrespondingPrices(targetPrices, ratio)

  return {
    ratio,
    inverseRatio,
    priceTable,
    primarySymbol,
    relativeSymbol
  }
}

/**
 * 格式化價格
 */
export function formatPrice(value: number, decimals: number = 2): string {
  return value.toFixed(decimals)
}

/**
 * 格式化比率
 */
export function formatRatio(value: number, decimals: number = 4): string {
  return value.toFixed(decimals)
}

/**
 * 解析目標價格字符串（支持逗號分隔、換行分隔）
 * @param input 用戶輸入的價格字符串
 * @returns 價格數組
 */
export function parseTargetPrices(input: string): number[] {
  if (!input.trim()) return []

  return Array.from(new Set(input
    .split(/[,\n\s]+/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
    .map(s => parseFloat(s))
    .filter(n => Number.isFinite(n) && n > 0)))
    .sort((a, b) => a - b)
}
