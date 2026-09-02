import { describe, expect, it } from 'vitest'
import {
  companyHubResponseSchema,
} from '~/lib/contracts/company-hub'
import {
  completeThesisReviewRequestSchema,
  investmentThesisResponseSchema,
  saveInvestmentThesisRequestSchema,
} from '~/lib/contracts/investment-thesis'

const instant = '2026-09-02T12:00:00.000Z'

const thesis = {
  id: '1',
  userId: '2',
  stockId: '3',
  symbol: 'AAPL',
  status: 'ACTIVE' as const,
  health: 'healthy' as const,
  summary: 'Durable compounder',
  whyIOwnIt: 'Moat and reinvestment runway',
  growthDrivers: null,
  risks: null,
  invalidationConditions: null,
  expectedHoldingPeriod: '5 years',
  reviewDueAt: instant,
  lastReviewedAt: null,
  latestReviewOutcome: null,
  activatedAt: instant,
  archivedAt: null,
  createdAt: instant,
  updatedAt: instant,
}

const review = {
  id: '4',
  thesisId: '1',
  userId: '2',
  reviewedAt: instant,
  outcome: 'INTACT' as const,
  portfolioDecision: 'HOLD' as const,
  whatImproved: 'Revenue quality improved',
  whatDeteriorated: null,
  whatChanged: null,
  invalidationTriggered: false,
  snapshot: {
    status: 'ACTIVE' as const,
    summary: thesis.summary,
    whyIOwnIt: thesis.whyIOwnIt,
    growthDrivers: null,
    risks: null,
    invalidationConditions: null,
    expectedHoldingPeriod: '5 years',
    reviewDueAt: instant,
  },
  createdAt: instant,
}

describe('investment thesis and Company Hub contracts', () => {
  it('rejects an ACTIVE thesis without required projection fields', () => {
    expect(() => saveInvestmentThesisRequestSchema.parse({ status: 'ACTIVE' })).toThrow()
  })

  it('rejects review writes without a meaningful reflection', () => {
    expect(() => completeThesisReviewRequestSchema.parse({
      outcome: 'INTACT',
      portfolioDecision: 'HOLD',
    })).toThrow()
  })

  it('accepts canonical thesis response IDs and instants', () => {
    expect(investmentThesisResponseSchema.parse({ thesis, reviews: [review] })).toMatchObject({
      thesis: { id: '1', stockId: '3', reviewDueAt: instant },
      reviews: [{ id: '4', thesisId: '1' }],
    })
  })

  it('requires Company Hub related Diary dates to be calendar dates', () => {
    const hub = {
      company: { id: '3', symbol: 'AAPL', name: null, currency: null, watchStatus: null },
      position: {
        state: 'untracked' as const,
        quantity: 0,
        averageCost: null,
        totalCost: 0,
        price: null,
        marketValue: null,
        concentrationPct: null,
        concentrationBasis: 'unavailable' as const,
        quoteStatus: 'missing' as const,
      },
      thesis,
      latestReview: review,
      reviews: [review],
      notes: [],
      evidence: [],
      relatedDiaries: [{ id: '5', title: 'Decision', date: '2026-09-02', transactionCount: 0, relation: 'explicit_context' as const }],
    }
    expect(companyHubResponseSchema.parse(hub).relatedDiaries[0]?.date).toBe('2026-09-02')
    expect(() => companyHubResponseSchema.parse({ ...hub, relatedDiaries: [{ ...hub.relatedDiaries[0], date: instant }] })).toThrow()
  })
})
