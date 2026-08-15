import { fetchQuotesBounded } from '~/lib/market-data/quote'
import type { QuoteResponse } from '~/lib/yahoo-finance'
import { calculateHoldings, type Holding } from '~/lib/position-state'
import {
  computePortfolioAggregations,
  hasFiniteQuote,
  type HoldingViewInput,
  type PortfolioAggregations,
} from '~/lib/stocks-view'
import {
  readPortfolioTransactions,
  type TransactionReadRow,
} from '~/server/utils/transaction-read'

export type ValuedHolding = HoldingViewInput

export interface ValuedHoldingsResult {
  /** Every open position, retained even when its quote is unavailable. */
  holdings: ValuedHolding[]
  /** The same projection restricted to finite, non-negative quote prices. */
  pricedHoldings: ValuedHolding[]
  valuation: PortfolioAggregations
  quoteErrors: string[]
  /** Kept for the existing portfolio API response contract. */
  marketState: string | null
}

export interface PortfolioHoldingsSnapshot {
  transactions: TransactionReadRow[]
  holdings: Holding[]
}

/** Read the owner-scoped transaction ledger and derive the open positions once. */
export async function loadPortfolioSnapshot(userId: bigint): Promise<PortfolioHoldingsSnapshot> {
  const transactions = await readPortfolioTransactions(userId)
  return { transactions, holdings: calculateHoldings(transactions) }
}

/** Read the owner-scoped transaction ledger and return only open positions. */
export async function loadPortfolioHoldings(userId: bigint): Promise<Holding[]> {
  const { holdings } = await loadPortfolioSnapshot(userId)
  return holdings
}

function enrichHolding(holding: Holding, quote: QuoteResponse | undefined): ValuedHolding {
  if (!quote) return holding

  return {
    ...holding,
    price: quote.regularMarketPrice,
    dayChange: quote.change,
    dayChangePercent: quote.changePercent,
    quoteAsOf: quote.lastUpdateTime,
  }
}

/**
 * Load every open position and best-effort enrich it with bounded cached quotes.
 * Quote failures stay attached to the read result as data-quality metadata;
 * they never make a persisted holding disappear.
 */
export async function loadValuedHoldings(userId: bigint): Promise<ValuedHoldingsResult> {
  const { holdings } = await loadPortfolioSnapshot(userId)
  const { quotes, errors: quoteErrors } = await fetchQuotesBounded(
    holdings.map(holding => holding.symbol),
  )
  const valuedHoldings = holdings.map(holding => enrichHolding(holding, quotes.get(holding.symbol)))
  const pricedHoldings = valuedHoldings.filter(hasFiniteQuote)
  const firstQuote = quotes.values().next().value

  return {
    holdings: valuedHoldings,
    pricedHoldings,
    valuation: computePortfolioAggregations(valuedHoldings),
    quoteErrors,
    marketState: firstQuote?.marketState ?? null,
  }
}
