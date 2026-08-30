import type { CurrentInvestmentThesis, ThesisReviewRecord } from './investment-thesis'
import type { StockTimelineSourceType } from '~/lib/stocks/timeline-source'

export type CompanyHoldingState = 'held' | 'closed' | 'research_only' | 'untracked'

export interface CompanyHubPosition {
  state: CompanyHoldingState
  quantity: number
  averageCost: number | null
  totalCost: number
  price: number | null
  marketValue: number | null
  concentrationPct: number | null
  concentrationBasis: 'cost_basis' | 'unavailable'
  quoteStatus: 'priced' | 'missing'
}

export interface CompanyHubDiary {
  id: string
  title: string
  date: string
  transactionCount: number
  relation: 'explicit_context' | 'transaction'
}

export interface CompanyHubResponse {
  company: {
    id: string | null
    symbol: string
    name: string | null
    currency: string | null
    watchStatus: 'WATCHING' | 'ARCHIVED' | null
  }
  position: CompanyHubPosition
  thesis: CurrentInvestmentThesis | null
  latestReview: ThesisReviewRecord | null
  reviews: ThesisReviewRecord[]
  notes: Array<{
    id: string
    title: string
    content: string
    date: string
    createdVia: 'USER' | 'AGENT'
    createdByLabel: string | null
    source: 'owner' | 'partner'
    sourceName: string | null
  }>
  evidence: Array<{
    id: string
    summary: string
    sourceType: StockTimelineSourceType
    sourceTitle: string | null
    sourceUrl: string | null
    occurredAt: string
    createdByLabel: string | null
  }>
  relatedDiaries: CompanyHubDiary[]
}
