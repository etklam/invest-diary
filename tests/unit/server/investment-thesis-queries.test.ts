import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  stockUpsert: vi.fn(),
  thesisFindUnique: vi.fn(),
  thesisFindFirst: vi.fn(),
  thesisUpsert: vi.fn(),
  txReviewCreate: vi.fn(),
  txThesisUpdate: vi.fn(),
  transaction: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    stock: { upsert: mocks.stockUpsert },
    investmentThesis: {
      findUnique: mocks.thesisFindUnique,
      findFirst: mocks.thesisFindFirst,
      upsert: mocks.thesisUpsert,
    },
    $transaction: mocks.transaction,
  },
}))

import {
  completeThesisReview,
  deriveInvestmentThesisHealth,
  saveCurrentThesis,
} from '~/server/utils/investment-thesis-queries'

const now = new Date('2026-08-11T00:00:00.000Z')
const thesis = {
  id: 3n,
  userId: 7n,
  stockId: 11n,
  status: 'ACTIVE' as const,
  summary: 'Compounder',
  whyIOwnIt: 'Durable moat',
  growthDrivers: 'Cloud',
  risks: 'Valuation',
  invalidationConditions: 'Moat erosion',
  expectedHoldingPeriod: '5 years',
  reviewDueAt: new Date('2026-09-01T00:00:00.000Z'),
  lastReviewedAt: null,
  latestReviewOutcome: null,
  activatedAt: now,
  archivedAt: null,
  createdAt: now,
  updatedAt: now,
  stock: { symbol: 'AAPL' },
}

describe('Investment Thesis queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.stockUpsert.mockResolvedValue({ id: 11n })
    mocks.thesisFindUnique.mockResolvedValue(null)
    mocks.thesisUpsert.mockResolvedValue(thesis)
    mocks.transaction.mockImplementation(async (work: Function) => work({
      thesisReview: { create: mocks.txReviewCreate },
      investmentThesis: { update: mocks.txThesisUpdate },
    }))
  })

  it('derives health without persisting a second status machine', () => {
    expect(deriveInvestmentThesisHealth({ status: 'DRAFT', latestReviewOutcome: null, reviewDueAt: null }, now)).toBe('draft')
    expect(deriveInvestmentThesisHealth({ status: 'ARCHIVED', latestReviewOutcome: null, reviewDueAt: null }, now)).toBe('archived')
    expect(deriveInvestmentThesisHealth({ status: 'ACTIVE', latestReviewOutcome: 'INVALIDATED', reviewDueAt: null }, now)).toBe('invalidated')
    expect(deriveInvestmentThesisHealth({ status: 'ACTIVE', latestReviewOutcome: null, reviewDueAt: new Date('2026-08-10') }, now)).toBe('needs_review')
    expect(deriveInvestmentThesisHealth({ status: 'ACTIVE', latestReviewOutcome: 'INTACT', reviewDueAt: new Date('2026-08-12') }, now)).toBe('healthy')
  })

  it('upserts one current thesis by user+stock without adding a Watchlist row', async () => {
    await saveCurrentThesis({
      userId: 7n,
      symbol: ' aapl ',
      status: 'DRAFT',
      draft: { summary: ' Thesis ', whyIOwnIt: ' Reason ', reviewDueAt: null },
    })

    expect(mocks.stockUpsert).toHaveBeenCalledWith(expect.objectContaining({ where: { symbol: 'AAPL' } }))
    expect(mocks.thesisUpsert).toHaveBeenCalledWith(expect.objectContaining({
      where: { userId_stockId: { userId: 7n, stockId: 11n } },
      create: expect.objectContaining({ userId: 7n, stockId: 11n, summary: 'Thesis' }),
    }))
  })

  it('replaces the thesis in full: a partial payload no longer merges with persisted values', async () => {
    mocks.thesisFindUnique.mockResolvedValue({ activatedAt: now })

    await saveCurrentThesis({
      userId: 7n,
      symbol: 'AAPL',
      status: 'DRAFT',
      draft: { summary: ' New only ' },
    })

    expect(mocks.thesisUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: {
        summary: 'New only',
        whyIOwnIt: null,
        growthDrivers: null,
        risks: null,
        invalidationConditions: null,
        expectedHoldingPeriod: null,
        reviewDueAt: null,
        status: 'DRAFT',
        activatedAt: now,
        archivedAt: null,
      },
    }))
  })

  it('defaults absent status to DRAFT instead of inheriting the persisted status', async () => {
    mocks.thesisFindUnique.mockResolvedValue({ activatedAt: now })

    await saveCurrentThesis({ userId: 7n, symbol: 'AAPL', draft: {} })

    expect(mocks.thesisUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ status: 'DRAFT' }),
    }))
  })

  it('rejects an ACTIVE thesis without the required conviction fields before writing', async () => {
    await expect(saveCurrentThesis({ userId: 7n, symbol: 'AAPL', status: 'ACTIVE', draft: {} }))
      .rejects.toMatchObject({ statusCode: 400 })
    expect(mocks.thesisUpsert).not.toHaveBeenCalled()
  })

  it('preserves the original activation timestamp across re-activation', async () => {
    const firstActivatedAt = new Date('2026-01-01T00:00:00.000Z')
    mocks.thesisFindUnique.mockResolvedValue({ activatedAt: firstActivatedAt })

    await saveCurrentThesis({
      userId: 7n,
      symbol: 'AAPL',
      status: 'ACTIVE',
      draft: { summary: 'S', whyIOwnIt: 'W' },
    })

    expect(mocks.thesisUpsert).toHaveBeenCalledWith(expect.objectContaining({
      update: expect.objectContaining({ activatedAt: firstActivatedAt }),
    }))
  })

  it('stores an immutable snapshot and updates only the current review projection atomically', async () => {
    mocks.thesisFindFirst.mockResolvedValue(thesis)
    mocks.txReviewCreate.mockResolvedValue({ id: 20n })
    mocks.txThesisUpdate.mockResolvedValue(thesis)

    await completeThesisReview({
      userId: 7n,
      symbol: 'AAPL',
      reviewedAt: now,
      review: {
        outcome: 'PARTIAL',
        portfolioDecision: 'HOLD',
        whatImproved: 'Margins improved',
        whatDeteriorated: null,
        whatChanged: null,
        invalidationTriggered: false,
      },
    })

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.txReviewCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        thesisId: 3n,
        userId: 7n,
        snapshotSummary: 'Compounder',
        snapshotWhyIOwnIt: 'Durable moat',
        snapshotStatus: 'ACTIVE',
      }),
    })
    expect(mocks.txThesisUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 3n },
      data: { lastReviewedAt: now, latestReviewOutcome: 'PARTIAL' },
    }))
  })

  it('rejects a review with no meaningful reflection before writing', async () => {
    await expect(completeThesisReview({
      userId: 7n,
      symbol: 'AAPL',
      review: {
        outcome: 'INTACT',
        portfolioDecision: 'HOLD',
        whatImproved: '  ',
        whatDeteriorated: null,
        whatChanged: null,
      },
    })).rejects.toMatchObject({ code: 'SYS_VALIDATION_ERROR' })
    expect(mocks.transaction).not.toHaveBeenCalled()
  })
})
