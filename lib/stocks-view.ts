export interface HoldingViewInput {
  symbol: string
  quantity: number
  avgCost: number
  totalCost: number
  price?: number
  dayChange?: number
  dayChangePercent?: number
  quoteAsOf?: string
}

export interface HoldingView extends HoldingViewInput {
  marketValue: number | null
  unrealizedAmount: number | null
  unrealizedPct: number | null
  concentrationPct: number
  dayChangeAmount: number | null
}

/**
 * Portfolio-level aggregations computed from holdings
 */
export interface PortfolioAggregations {
  totalHoldings: number
  totalCost: number
  currentMarketValue: number | null
  unrealizedAmount: number | null
  unrealizedPct: number | null
  totalDayChange: number | null
  totalDayChangePercent: number | null
  largestPositionPct: number | null
  top3ConcentrationPct: number | null
  activePositionCount: number
  concentrationWarning: boolean
  largestPositionSymbol: string | null
  pricedPositionCount: number
  unpricedPositionCount: number
  pricedCostBasis: number
  unpricedCostBasis: number
  quoteCoveragePct: number
  valuationAsOf: string | null
  staleQuoteCount: number
  valuationStatus: 'empty' | 'complete' | 'partial' | 'unavailable'
  unsupportedMetrics: readonly ['ytdReturn', 'realCashPercentage', 'sectorConcentration']
}

export interface PortfolioValuationResponse {
  holdings: HoldingViewInput[]
  valuation: PortfolioAggregations
  quoteErrors: string[]
  marketState: string | null
}

const hasFiniteQuote = (holding: HoldingViewInput) =>
  typeof holding.price === 'number' && Number.isFinite(holding.price) && holding.price >= 0

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
    const hasQuote = hasFiniteQuote(holding)
    const marketValue = hasQuote ? holding.price! * holding.quantity : null
    const unrealizedAmount = hasQuote ? marketValue! - holding.totalCost : null
    const unrealizedPct = hasQuote && holding.totalCost > 0
      ? (unrealizedAmount! / holding.totalCost) * 100
      : null
    const concentrationPct = totalCostAll > 0 ? (holding.totalCost / totalCostAll) * 100 : 0
    const dayChangeAmount = (holding.dayChange !== undefined && holding.quantity) 
      ? holding.dayChange * holding.quantity 
      : null

    return {
      ...holding,
      marketValue,
      unrealizedAmount,
      unrealizedPct,
      concentrationPct,
      dayChangeAmount
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

/**
 * Compute portfolio-level aggregations from holdings
 * @param holdings - Array of holdings with optional price data
 * @returns Portfolio-level statistics
 */
export function computePortfolioAggregations(
  holdings: HoldingViewInput[],
  options: { now?: Date; staleAfterMs?: number } = {},
): PortfolioAggregations {
  const totalHoldings = holdings.length
  const totalCost = holdings.reduce((sum, h) => sum + h.totalCost, 0)
  const pricedHoldings = holdings.filter(hasFiniteQuote)
  const unpricedHoldings = holdings.filter(holding => !hasFiniteQuote(holding))
  const pricedPositionCount = pricedHoldings.length
  const unpricedPositionCount = unpricedHoldings.length
  const pricedCostBasis = pricedHoldings.reduce((sum, holding) => sum + holding.totalCost, 0)
  const unpricedCostBasis = unpricedHoldings.reduce((sum, holding) => sum + holding.totalCost, 0)
  const pricedMarketValue = pricedHoldings.reduce(
    (sum, holding) => sum + holding.price! * holding.quantity,
    0,
  )
  const currentMarketValue = pricedPositionCount > 0 ? pricedMarketValue : null
  const unrealizedAmount = currentMarketValue === null ? null : currentMarketValue - pricedCostBasis
  const unrealizedPct = unrealizedAmount !== null && pricedCostBasis > 0
    ? (unrealizedAmount / pricedCostBasis) * 100
    : null

  const dayChangeHoldings = pricedHoldings.filter(h => typeof h.dayChange === 'number' && Number.isFinite(h.dayChange))
  const totalDayChange = dayChangeHoldings.length > 0 ? dayChangeHoldings.reduce(
    (sum, h) => sum + (typeof h.dayChange === 'number' ? h.dayChange * h.quantity : 0),
    0
  ) : null
  const prevMarketValue = currentMarketValue !== null && totalDayChange !== null
    ? currentMarketValue - totalDayChange
    : null
  const totalDayChangePercent = prevMarketValue !== null && prevMarketValue > 0 && totalDayChange !== null
    ? (totalDayChange / prevMarketValue) * 100
    : null
  const positionValues = pricedHoldings
    .map(holding => ({
      symbol: holding.symbol,
      value: holding.price! * holding.quantity,
    }))
    .filter(holding => holding.value > 0)
    .sort((a, b) => b.value - a.value)
  const largestPosition = positionValues[0] ?? null
  const largestPositionPct = largestPosition && currentMarketValue !== null && currentMarketValue > 0
    ? (largestPosition.value / currentMarketValue) * 100
    : null
  const top3Value = positionValues.slice(0, 3).reduce((sum, holding) => sum + holding.value, 0)
  const top3ConcentrationPct = currentMarketValue !== null && currentMarketValue > 0
    ? (top3Value / currentMarketValue) * 100
    : null
  const activePositionCount = holdings.length
  const concentrationWarning = (largestPositionPct ?? 0) >= 25 || (top3ConcentrationPct ?? 0) >= 60
  const quoteCoveragePct = totalHoldings > 0 ? (pricedPositionCount / totalHoldings) * 100 : 0
  const quoteTimes = pricedHoldings
    .map(holding => holding.quoteAsOf ? Date.parse(holding.quoteAsOf) : Number.NaN)
    .filter(Number.isFinite)
  const valuationAsOf = quoteTimes.length > 0 ? new Date(Math.min(...quoteTimes)).toISOString() : null
  const nowMs = (options.now ?? new Date()).getTime()
  const staleAfterMs = options.staleAfterMs ?? 72 * 60 * 60 * 1000
  const staleQuoteCount = quoteTimes.filter(time => nowMs - time > staleAfterMs).length
  const valuationStatus = totalHoldings === 0
    ? 'empty'
    : pricedPositionCount === 0
      ? 'unavailable'
      : unpricedPositionCount > 0
        ? 'partial'
        : 'complete'

  return {
    totalHoldings,
    totalCost,
    currentMarketValue,
    unrealizedAmount,
    unrealizedPct,
    totalDayChange,
    totalDayChangePercent,
    largestPositionPct,
    top3ConcentrationPct,
    activePositionCount,
    concentrationWarning,
    largestPositionSymbol: largestPosition?.symbol ?? null,
    pricedPositionCount,
    unpricedPositionCount,
    pricedCostBasis,
    unpricedCostBasis,
    quoteCoveragePct,
    valuationAsOf,
    staleQuoteCount,
    valuationStatus,
    unsupportedMetrics: ['ytdReturn', 'realCashPercentage', 'sectorConcentration'],
  }
}
