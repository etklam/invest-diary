export interface HoldingViewInput {
  symbol: string
  quantity: number
  avgCost: number
  totalCost: number
  price?: number
}

export interface HoldingView extends HoldingViewInput {
  marketValue: number | null
  unrealizedAmount: number | null
  unrealizedPct: number | null
  concentrationPct: number
}

export type ProfitStatusFilter = 'all' | 'gain' | 'loss' | 'no-quote'
export type ConcentrationFilter = 'all' | 'ge10' | 'ge20'
export type SortDirection = 'asc' | 'desc'
export type StocksSortKey =
  | 'symbol'
  | 'quantity'
  | 'avgCost'
  | 'totalCost'
  | 'percentage'
  | 'marketValue'
  | 'unrealizedPct'

export interface StocksViewOptions {
  search: string
  profitStatus: ProfitStatusFilter
  concentration: ConcentrationFilter
  sortKey: StocksSortKey
  sortDir: SortDirection
}

export function applyStocksView(
  holdings: HoldingViewInput[],
  options: StocksViewOptions
): HoldingView[] {
  const totalCostAll = holdings.reduce((sum, h) => sum + h.totalCost, 0)
  const search = options.search.trim().toLowerCase()

  const withDerived: HoldingView[] = holdings.map((holding) => {
    const hasQuote = typeof holding.price === 'number'
    const marketValue = hasQuote ? holding.price! * holding.quantity : null
    const unrealizedAmount = hasQuote ? marketValue! - holding.totalCost : null
    const unrealizedPct = hasQuote && holding.totalCost > 0
      ? (unrealizedAmount! / holding.totalCost) * 100
      : null
    const concentrationPct = totalCostAll > 0 ? (holding.totalCost / totalCostAll) * 100 : 0

    return {
      ...holding,
      marketValue,
      unrealizedAmount,
      unrealizedPct,
      concentrationPct
    }
  })

  const filtered = withDerived
    .filter((h) => (search ? h.symbol.toLowerCase().includes(search) : true))
    .filter((h) => {
      if (options.profitStatus === 'all') return true
      if (options.profitStatus === 'no-quote') return h.unrealizedAmount === null
      if (options.profitStatus === 'gain') return (h.unrealizedAmount ?? 0) > 0
      return (h.unrealizedAmount ?? 0) < 0
    })
    .filter((h) => {
      if (options.concentration === 'all') return true
      if (options.concentration === 'ge10') return h.concentrationPct >= 10
      return h.concentrationPct >= 20
    })

  filtered.sort((a, b) => {
    let result = 0
    switch (options.sortKey) {
      case 'symbol':
        result = a.symbol.localeCompare(b.symbol)
        break
      case 'quantity':
        result = a.quantity - b.quantity
        break
      case 'avgCost':
        result = a.avgCost - b.avgCost
        break
      case 'totalCost':
        result = a.totalCost - b.totalCost
        break
      case 'percentage':
        result = a.concentrationPct - b.concentrationPct
        break
      case 'marketValue':
        if (a.marketValue === null && b.marketValue === null) return 0
        if (a.marketValue === null) return 1
        if (b.marketValue === null) return -1
        result = a.marketValue - b.marketValue
        break
      case 'unrealizedPct':
        if (a.unrealizedPct === null && b.unrealizedPct === null) return 0
        if (a.unrealizedPct === null) return 1
        if (b.unrealizedPct === null) return -1
        result = a.unrealizedPct - b.unrealizedPct
        break
    }
    return options.sortDir === 'asc' ? result : -result
  })

  return filtered
}
