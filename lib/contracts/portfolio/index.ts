import { z } from 'zod'
import { serializedIdSchema, utcInstantSchema } from '../common'
import { stockSymbolSchema } from '../stocks'

export const PORTFOLIO_MAX_HOLDINGS = 1_000
export const PORTFOLIO_MAX_QUOTE_ERRORS = 1_000

/**
 * Portfolio overview is a read-only projection calculated from the
 * transaction ledger.  These values intentionally remain JSON numbers:
 * position-state arithmetic is a bounded display projection, while persisted
 * transaction/Trade Plan Decimal values use decimalStringSchema.
 */
export const portfolioHoldingSchema = z.object({
  symbol: stockSymbolSchema,
  quantity: z.number().finite().nonnegative(),
  avgCost: z.number().finite().nonnegative(),
  totalCost: z.number().finite().nonnegative(),
  price: z.number().finite().nonnegative().optional(),
  dayChange: z.number().finite().optional(),
  dayChangePercent: z.number().finite().optional(),
  quoteAsOf: utcInstantSchema.optional(),
}).strict()

export const portfolioHoldingsResponseSchema = z.array(portfolioHoldingSchema).max(PORTFOLIO_MAX_HOLDINGS)

const portfolioPercentageSchema = z.number().finite().min(0).max(100).nullable()
const portfolioNullableNumberSchema = z.number().finite().nullable()

export const portfolioAggregationsSchema = z.object({
  totalHoldings: z.number().int().nonnegative(),
  totalCost: z.number().finite().nonnegative(),
  currentMarketValue: portfolioNullableNumberSchema,
  unrealizedAmount: portfolioNullableNumberSchema,
  unrealizedPct: portfolioNullableNumberSchema,
  totalDayChange: portfolioNullableNumberSchema,
  totalDayChangePercent: portfolioNullableNumberSchema,
  largestPositionPct: portfolioPercentageSchema,
  top3ConcentrationPct: portfolioPercentageSchema,
  activePositionCount: z.number().int().nonnegative(),
  concentrationWarning: z.boolean(),
  largestPositionSymbol: stockSymbolSchema.nullable(),
  pricedPositionCount: z.number().int().nonnegative(),
  unpricedPositionCount: z.number().int().nonnegative(),
  pricedCostBasis: z.number().finite().nonnegative(),
  unpricedCostBasis: z.number().finite().nonnegative(),
  quoteCoveragePct: z.number().finite().min(0).max(100),
  valuationAsOf: utcInstantSchema.nullable(),
  staleQuoteCount: z.number().int().nonnegative(),
  valuationStatus: z.enum(['empty', 'complete', 'partial', 'unavailable']),
  unsupportedMetrics: z.tuple([
    z.literal('ytdReturn'),
    z.literal('realCashPercentage'),
    z.literal('sectorConcentration'),
  ]),
}).strict()

export const portfolioValuationResponseSchema = z.object({
  holdings: portfolioHoldingsResponseSchema,
  valuation: portfolioAggregationsSchema,
  quoteErrors: z.array(stockSymbolSchema).max(PORTFOLIO_MAX_QUOTE_ERRORS),
  marketState: z.string().trim().min(1).max(32).nullable(),
}).strict()

export type PortfolioHolding = z.infer<typeof portfolioHoldingSchema>
export type PortfolioHoldingsResponse = z.infer<typeof portfolioHoldingsResponseSchema>
export type PortfolioAggregations = z.infer<typeof portfolioAggregationsSchema>
export type PortfolioValuationResponse = z.infer<typeof portfolioValuationResponseSchema>

export function toPortfolioHoldingsResponse(value: unknown): PortfolioHoldingsResponse {
  return portfolioHoldingsResponseSchema.parse(value)
}

export function toPortfolioValuationResponse(value: unknown): PortfolioValuationResponse {
  return portfolioValuationResponseSchema.parse(value)
}

export const PORTFOLIO_ATTENTION_REASONS = [
  'invalidated_thesis_while_held',
  'overdue_thesis_review',
  'overdue_diary_review',
  'position_concentration',
  'missing_thesis',
] as const

export const portfolioAttentionReasonSchema = z.enum(PORTFOLIO_ATTENTION_REASONS)
export const portfolioAttentionTargetKindSchema = z.enum(['stock', 'diary'])

const portfolioAttentionEvidenceSchema = z.object({
  concentrationPct: z.number().finite().nullable().optional(),
  reviewDueAt: utcInstantSchema.nullable().optional(),
  latestOutcome: z.string().trim().min(1).max(64).nullable().optional(),
  title: z.string().max(280).optional(),
}).strict()

const stockAttentionItemSchema = z.object({
  id: z.string().trim().min(1).max(256),
  reason: portfolioAttentionReasonSchema,
  targetKind: z.literal('stock'),
  targetId: stockSymbolSchema,
  symbol: stockSymbolSchema,
  priority: z.number().int().nonnegative(),
  action: z.string().trim().min(1).max(1_024),
  evidence: portfolioAttentionEvidenceSchema,
  asOf: utcInstantSchema,
}).strict()

const diaryAttentionItemSchema = z.object({
  id: z.string().trim().min(1).max(256),
  reason: portfolioAttentionReasonSchema,
  targetKind: z.literal('diary'),
  targetId: serializedIdSchema,
  symbol: stockSymbolSchema.nullable(),
  priority: z.number().int().nonnegative(),
  action: z.string().trim().min(1).max(1_024),
  evidence: portfolioAttentionEvidenceSchema,
  asOf: utcInstantSchema,
}).strict()

export const portfolioAttentionItemSchema = z.discriminatedUnion('targetKind', [
  stockAttentionItemSchema,
  diaryAttentionItemSchema,
])

export const portfolioAttentionQuerySchema = z.object({}).strict()

export const portfolioAttentionResponseSchema = z.object({
  items: z.array(portfolioAttentionItemSchema).max(50),
  asOf: utcInstantSchema,
  coverage: z.object({
    valuationStatus: z.enum(['empty', 'complete', 'partial', 'unavailable']),
    complete: z.boolean(),
    priced: z.number().int().nonnegative(),
    total: z.number().int().nonnegative(),
  }).strict(),
}).strict()

export type PortfolioAttentionReason = z.infer<typeof portfolioAttentionReasonSchema>
export type PortfolioAttentionItem = z.infer<typeof portfolioAttentionItemSchema>
export type PortfolioAttentionQuery = z.infer<typeof portfolioAttentionQuerySchema>
export type PortfolioAttentionResponse = z.infer<typeof portfolioAttentionResponseSchema>

export const portfolioAttentionListResponseSchema = portfolioAttentionResponseSchema

export function toPortfolioAttentionResponse(value: unknown): PortfolioAttentionResponse {
  return portfolioAttentionResponseSchema.parse(value)
}
