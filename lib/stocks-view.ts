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

export type ConcentrationBasis = 'market_value' | 'cost_basis'

/**
 * Single concentration formula: each holding's share of the portfolio in %,
 * under one declared basis.
 *
 * - 'market_value' — share of the priced subset. Holdings without a finite
 *   quote are excluded from the map entirely, so partial quote coverage shows
 *   up as missing entries instead of silently re-weighted percentages.
 * - 'cost_basis' — share of total cost across all holdings.
 *
 * The map is empty when the chosen denominator is <= 0. Keys are holding
 * symbols; callers turn absence into their own null/0 semantics.
 */
export function concentration(
  holdings: HoldingViewInput[],
  options: { basis: ConcentrationBasis },
): Map<string, number> {
  const shares = new Map<string, number>()

  if (options.basis === 'cost_basis') {
    const totalCostAll = holdings.reduce((sum, h) => sum + h.totalCost, 0)
    if (totalCostAll <= 0) return shares
    for (const holding of holdings) {
      shares.set(holding.symbol, (holding.totalCost / totalCostAll) * 100)
    }
    return shares
  }

  const pricedHoldings = holdings.filter(hasFiniteQuote)
  const pricedMarketValue = pricedHoldings.reduce(
    (sum, h) => sum + h.price! * h.quantity,
    0,
  )
  if (pricedMarketValue <= 0) return shares
  for (const holding of pricedHoldings) {
    shares.set(holding.symbol, ((holding.price! * holding.quantity) / pricedMarketValue) * 100)
  }
  return shares
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
  // Per-holding display concentration is explicitly cost-basis (a holding's
  // share is knowable even before quotes load).
  const concentrationBySymbol = concentration(holdings, { basis: 'cost_basis' })
  const search = options.search.trim().toLowerCase()

  const withDerived: HoldingView[] = holdings.map((holding) => {
    const hasQuote = hasFiniteQuote(holding)
    const marketValue = hasQuote ? holding.price! * holding.quantity : null
    const unrealizedAmount = hasQuote ? marketValue! - holding.totalCost : null
    const unrealizedPct = hasQuote && holding.totalCost > 0
      ? (unrealizedAmount! / holding.totalCost) * 100
      : null
    const concentrationPct = concentrationBySymbol.get(holding.symbol) ?? 0
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
  // Largest / top-3 concentration is explicitly market-value basis, computed by
  // the single concentration() formula over the priced subset.
  const marketValueShares = concentration(holdings, { basis: 'market_value' })
  const rankedShares = [...marketValueShares.entries()].sort((a, b) => b[1] - a[1])
  const largestPosition = rankedShares[0] ?? null
  const largestPositionPct = largestPosition ? largestPosition[1] : null
  const top3ConcentrationPct = rankedShares.length > 0
    ? rankedShares.slice(0, 3).reduce((sum, [, pct]) => sum + pct, 0)
    : null
  const activePositionCount = holdings.length
  // Display-tier risk flag (largest >= 25% or top-3 >= 60%). This is a distinct
  // concept from the attention engine's `position_concentration` alert
  // (portfolio-attention.ts): that one fires a single-position card at a
  // configurable threshold (default 25% market value). Shared formula, separate
  // semantics — do not merge the thresholds.
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
    largestPositionSymbol: largestPosition?.[0] ?? null,
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
