import type { SerializedId } from './common'

export const INVESTMENT_THESIS_STATUSES = ['DRAFT', 'ACTIVE', 'ARCHIVED'] as const
export type InvestmentThesisStatus = typeof INVESTMENT_THESIS_STATUSES[number]

export const THESIS_REVIEW_OUTCOMES = ['INTACT', 'PARTIAL', 'INVALIDATED', 'UNCLEAR'] as const
export type ThesisReviewOutcome = typeof THESIS_REVIEW_OUTCOMES[number]

export const THESIS_PORTFOLIO_DECISIONS = ['HOLD', 'ADD', 'REDUCE', 'EXIT', 'CONTINUE_WATCHING'] as const
export type ThesisPortfolioDecision = typeof THESIS_PORTFOLIO_DECISIONS[number]

export type InvestmentThesisHealth = 'draft' | 'healthy' | 'needs_review' | 'invalidated' | 'archived'

export interface InvestmentThesisDraft {
  summary?: string | null
  whyIOwnIt?: string | null
  growthDrivers?: string | null
  risks?: string | null
  invalidationConditions?: string | null
  expectedHoldingPeriod?: string | null
  reviewDueAt?: string | null
}

/** Stable current projection consumed by Company Hub and the attention engine. */
export interface CurrentInvestmentThesis extends InvestmentThesisDraft {
  id: SerializedId
  userId: SerializedId
  stockId: SerializedId
  symbol: string
  status: InvestmentThesisStatus
  health: InvestmentThesisHealth
  lastReviewedAt: string | null
  latestReviewOutcome: ThesisReviewOutcome | null
  activatedAt: string | null
  archivedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface CompleteThesisReviewInput {
  outcome: ThesisReviewOutcome
  portfolioDecision: ThesisPortfolioDecision
  whatImproved?: string | null
  whatDeteriorated?: string | null
  whatChanged?: string | null
  invalidationTriggered?: boolean
}

export interface ThesisReviewRecord extends CompleteThesisReviewInput {
  id: SerializedId
  thesisId: SerializedId
  userId: SerializedId
  reviewedAt: string
  snapshot: {
    status: InvestmentThesisStatus
    summary: string | null
    whyIOwnIt: string | null
    growthDrivers: string | null
    risks: string | null
    invalidationConditions: string | null
    expectedHoldingPeriod: string | null
    reviewDueAt: string | null
  }
  createdAt: string
}

export interface InvestmentThesisResponse {
  thesis: CurrentInvestmentThesis | null
  reviews: ThesisReviewRecord[]
}
