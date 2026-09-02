import { describe, expect, it } from 'vitest'
import {
  InvalidActivityCursorError,
  mergeInvestmentActivity,
} from '~/lib/investment-activity'

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

  it('keeps an unfiltered cursor unfiltered across pages', () => {
    const sources = {
      diaries: [
        { id: '1', date: '2026-08-10', title: 'AAPL decision', symbols: ['AAPL'] },
        { id: '2', date: '2026-08-09', title: 'MSFT decision', symbols: ['MSFT'] },
      ],
    }
    const first = mergeInvestmentActivity(sources, { limit: 1, asOf: new Date('2026-08-10T23:00:00.000Z') })
    const second = mergeInvestmentActivity(sources, { limit: 1, cursor: first.pagination.nextCursor, asOf: first.pagination.asOf })

    expect(first.items[0]?.id).toBe('diary:1')
    expect(second.items[0]?.id).toBe('diary:2')
  })

  it('returns the canonical envelope and serializes diary dates and transaction decimals', () => {
    const result = mergeInvestmentActivity({
      diaries: [{
        id: '12',
        date: '2026-08-10T12:00:00.000Z',
        title: 'Decision',
        symbols: ['aapl'],
        transactionContext: [{ id: '13', symbol: 'aapl', type: 'buy', quantity: 1.25, price: 100 }],
      }],
    }, { asOf: new Date('2026-08-10T23:00:00.000Z'), limit: 20 })

    expect(Object.keys(result)).toEqual(['data', 'pagination'])
    expect(result.data[0]).toMatchObject({ id: 'diary:12', occurredAt: '2026-08-10' })
    expect(result.data[0]?.metadata.transactionContext).toEqual([{
      id: '13', symbol: 'AAPL', type: 'BUY', quantity: '1.25', price: '100',
    }])
    expect(result.pagination).toMatchObject({ nextCursor: null, hasMore: false, asOf: '2026-08-10T23:00:00.000Z' })
  })

  it('does not include source records newer than the fixed as-of snapshot', () => {
    const result = mergeInvestmentActivity({
      diaries: [{ id: '1', date: '2026-08-11T12:00:00.000Z', title: 'Future diary' }],
      thesisReviews: [{ id: '2', reviewedAt: '2026-08-11T00:00:01.000Z', symbol: 'AAPL', outcome: 'INTACT', portfolioDecision: 'HOLD' }],
      stockTimeline: [{ id: '3', occurredAt: '2026-08-11T00:00:01.000Z', symbol: 'AAPL', summary: 'Future evidence', sourceType: 'ARTICLE' }],
      currentTheses: [{ id: '4', updatedAt: '2026-08-11T00:00:01.000Z', symbol: 'AAPL', status: 'ACTIVE' }],
    }, { asOf: new Date('2026-08-10T23:59:59.999Z'), limit: 20 })

    expect(result.data).toEqual([])
    expect(result.pagination.hasMore).toBe(false)
  })

  it('rejects malformed and mismatched cursors instead of returning page one', () => {
    expect(() => mergeInvestmentActivity({ diaries: [{ id: '1', date: '2026-08-10', title: 'Decision' }] }, { cursor: 'not-a-cursor' }))
      .toThrow(InvalidActivityCursorError)

    const first = mergeInvestmentActivity({
      diaries: [
        { id: '1', date: '2026-08-10', title: 'Decision', symbols: ['AAPL'] },
        { id: '2', date: '2026-08-09', title: 'Older', symbols: ['AAPL'] },
      ],
    }, { symbol: 'AAPL', asOf: new Date('2026-08-10T23:00:00.000Z'), limit: 1 })

    expect(() => mergeInvestmentActivity({}, {
      symbol: 'MSFT',
      asOf: new Date('2026-08-10T23:00:00.000Z'),
      cursor: first.pagination.nextCursor,
    })).toThrow(InvalidActivityCursorError)
  })
})
