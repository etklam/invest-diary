import { describe, expect, it } from 'vitest'
import { mergeInvestmentActivity } from '~/lib/investment-activity'

describe('mergeInvestmentActivity', () => {
  const base = {
    diaries: [{ id: '1', date: '2026-08-10T12:00:00.000Z', title: 'Decision', content: 'Bought AAPL', symbols: ['aapl'], transactionContext: [{ id: 'tx1', symbol: 'AAPL', type: 'BUY', quantity: 1, price: 100 }] }],
    thesisReviews: [{ id: '2', reviewedAt: '2026-08-09T12:00:00.000Z', symbol: 'AAPL', outcome: 'INTACT', portfolioDecision: 'HOLD', reflectionSummary: 'Still valid' }],
    stockTimeline: [{ id: '3', occurredAt: '2026-08-08T12:00:00.000Z', symbol: 'AAPL', summary: 'Evidence', sourceType: 'ARTICLE' }],
    currentTheses: [{ id: '4', updatedAt: '2026-08-07T12:00:00.000Z', symbol: 'AAPL', status: 'ACTIVE', summary: 'Own it' }],
  }

  it('orders mixed sources and dedupes timeline evidence linked to a diary', () => {
    const result = mergeInvestmentActivity({
      ...base,
      stockTimeline: [{ ...base.stockTimeline[0], sourceDiaryId: '1' }],
    }, { limit: 20, asOf: new Date('2026-08-11T00:00:00.000Z') })
    expect(result.items.map(item => item.kind)).toEqual(['diary', 'thesis_review', 'thesis'])
  })

  it('filters symbols and keeps only one latest thesis per company', () => {
    const result = mergeInvestmentActivity({
      currentTheses: [
        { id: 'old', updatedAt: '2026-08-01T00:00:00.000Z', symbol: 'AAPL', status: 'ACTIVE', summary: 'old' },
        { id: 'new', updatedAt: '2026-08-02T00:00:00.000Z', symbol: ' aapl ', status: 'ACTIVE', summary: 'new' },
        { id: 'other', updatedAt: '2026-08-03T00:00:00.000Z', symbol: 'MSFT', status: 'ACTIVE', summary: 'other' },
      ],
    }, { symbol: 'AAPL', limit: 10 })
    expect(result.items).toHaveLength(1)
    expect(result.items[0]?.id).toBe('thesis:new')
  })

  it('uses a stable cursor for equal timestamps', () => {
    const sources = {
      diaries: [
        { id: '10', date: '2026-08-10T12:00:00.000Z', title: 'B' },
        { id: '2', date: '2026-08-10T12:00:00.000Z', title: 'A' },
      ],
    }
    const first = mergeInvestmentActivity(sources, { limit: 1 })
    const second = mergeInvestmentActivity(sources, { limit: 1, cursor: first.nextCursor })
    expect(first.items[0]?.id).toBe('diary:2')
    expect(second.items[0]?.id).toBe('diary:10')
  })
})
