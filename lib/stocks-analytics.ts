interface HoldingCostLike {
  symbol: string
  totalCost: number
}

interface BuildHoldingChartSegmentsOptions {
  radius: number
  strokeWidth: number
  colors?: string[]
}

export interface HoldingChartSegment {
  label: string
  percentage: string
  dashArray: string
  dashOffset: number
  color: string
  radius: number
  strokeWidth: number
}

const DEFAULT_COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#14b8a6', '#a855f7']

export function formatHoldingQuantity(quantity: number): string {
  return quantity.toFixed(4).replace(/\.?0+$/, '')
}

export function formatHoldingShare(cost: number, totalCost: number): string {
  if (totalCost === 0) return '0%'
  return `${((cost / totalCost) * 100).toFixed(1)}%`
}

export function getHoldingConcentrationClass(percentage: number): string {
  if (percentage >= 20) {
    return 'bg-red-100 text-red-800 dark:bg-red-950/30 dark:text-red-200'
  }

  if (percentage >= 10) {
    return 'bg-yellow-100 text-yellow-800 dark:bg-amber-950/30 dark:text-amber-200'
  }

  return 'bg-green-100 text-green-800 dark:bg-emerald-950/30 dark:text-emerald-200'
}

export function buildHoldingChartSegments(
  holdings: HoldingCostLike[],
  options: BuildHoldingChartSegmentsOptions
): HoldingChartSegment[] {
  const totalCost = holdings.reduce((sum, holding) => sum + holding.totalCost, 0)

  if (totalCost === 0 || holdings.length === 0) {
    return []
  }

  const colors = options.colors ?? DEFAULT_COLORS
  const circumference = 2 * Math.PI * options.radius
  let cumulative = 0

  return holdings.map((holding, index) => {
    const share = holding.totalCost / totalCost
    const strokeLength = share * circumference
    const dashArray = `${strokeLength} ${circumference - strokeLength}`
    const dashOffset = -cumulative * circumference
    const color = colors[index % colors.length] ?? DEFAULT_COLORS[0]!
    cumulative += share

    return {
      label: holding.symbol,
      percentage: `${(share * 100).toFixed(1)}%`,
      dashArray,
      dashOffset,
      color,
      radius: options.radius,
      strokeWidth: options.strokeWidth,
    }
  })
}
