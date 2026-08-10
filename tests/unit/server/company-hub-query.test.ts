import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  stockFindUnique: vi.fn(),
  diaryFindMany: vi.fn(),
  readTransactions: vi.fn(),
  findThesis: vi.fn(),
  partnerLinks: vi.fn(),
  fetchQuote: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    stock: { findUnique: mocks.stockFindUnique },
    stockWatchlist: { findUnique: vi.fn() },
    stockNote: { findMany: vi.fn() },
    stockTimelineRecord: { findMany: vi.fn() },
    diary: { findMany: mocks.diaryFindMany },
  },
}))
vi.mock('~/server/utils/transaction-read', () => ({ readPortfolioTransactions: mocks.readTransactions }))
vi.mock('~/server/utils/investment-thesis-queries', () => ({
  findCurrentThesisBySymbol: mocks.findThesis,
  listThesisReviews: vi.fn(),
  toCurrentInvestmentThesis: vi.fn(),
  toThesisReviewRecord: vi.fn(),
}))
vi.mock('~/server/utils/partner-queries', () => ({ findUserPartnerLinks: mocks.partnerLinks }))
vi.mock('~/lib/yahoo-finance', () => ({ fetchQuote: mocks.fetchQuote }))
vi.mock('~/lib/market-data/cache', () => ({
  buildMarketQuoteCacheKey: vi.fn(value => value),
  getMarketDataCacheTtlSeconds: vi.fn(() => 60),
  getOrSetCached: vi.fn((_key, _ttl, getter) => getter()),
}))

import { getCompanyHub } from '~/server/utils/company-hub-query'

describe('Company Hub query', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.stockFindUnique.mockResolvedValue(null)
    mocks.findThesis.mockResolvedValue(null)
    mocks.partnerLinks.mockResolvedValue([])
    mocks.fetchQuote.mockRejectedValue(new Error('no quote'))
    mocks.readTransactions.mockResolvedValue([
      { id: '1', symbol: 'AAPL', type: 'BUY', quantity: 2, price: 100, tradeDate: '2026-08-01' },
    ])
    mocks.diaryFindMany.mockResolvedValue([
      { id: 5n, title: 'Buy rationale', date: new Date('2026-08-01'), transactions: [{ id: 1n }] },
    ])
  })

  it('keeps held-but-not-watched companies useful without mutating Stock or guessing text links', async () => {
    const hub = await getCompanyHub(7n, ' aapl ')

    expect(hub.position.state).toBe('held')
    expect(hub.relatedDiaries).toEqual([expect.objectContaining({ id: '5', relation: 'transaction' })])
    expect(mocks.diaryFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId: 7n, transactions: { some: { symbol: 'AAPL' } } },
      take: 10,
    }))
    expect(hub.company.id).toBeNull()
  })
})
