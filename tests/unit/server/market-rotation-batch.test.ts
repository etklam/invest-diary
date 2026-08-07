import { describe, expect, it, vi } from 'vitest'
import { ensureCanonicalPrices, runScopeBatch, runFullBatch } from '~/server/utils/market-rotation-batch'

// ─── Mock setup ─────────────────────────────────────────────────────

// Mock the query functions
vi.mock('~/server/utils/market-rotation-queries', () => ({
  getHistoricalPrices: vi.fn(),
  getComparisonWindow: vi.fn(),
  getComparisonSnapshots: vi.fn(),
  upsertSnapshots: vi.fn(),
}))

// Mock the pipeline (pure function, tested elsewhere)
vi.mock('~/lib/market-rotation/pipeline', () => ({
  runSnapshotPipeline: vi.fn(),
}))

import { getHistoricalPrices, getComparisonWindow, getComparisonSnapshots, upsertSnapshots } from '~/server/utils/market-rotation-queries'
import { runSnapshotPipeline } from '~/lib/market-rotation/pipeline'

function makePrisma() {
  return {
    marketDailyPrice: {
      upsert: vi.fn().mockResolvedValue({ id: 1n }),
    },
  } as any
}

// ─── Tests ──────────────────────────────────────────────────────────

describe('runScopeBatch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('runs full pipeline for sectors scope', async () => {
    const prisma = makePrisma()

    // Mock: each symbol returns 60 days of price data
    vi.mocked(getHistoricalPrices).mockImplementation(async () => {
      const prices = []
      for (let i = 0; i < 260; i++) {
        const d = new Date('2099-01-01')
        d.setDate(d.getDate() + i)
        prices.push({ date: d, close: 100 + i, adjustedClose: 100 + i })
      }
      return prices
    })

    // Mock: comparison date found
    const compDate = new Date('2026-05-22')
    vi.mocked(getComparisonWindow).mockResolvedValue({
      rankScope: 'sectors',
      qualifiedDatesDesc: [new Date('2099-09-17'), compDate],
      latestDate: new Date('2099-09-17'),
      comparisonDate: compDate,
    })

    // Mock: comparison snapshots
    vi.mocked(getComparisonSnapshots).mockResolvedValue([
      {
        id: BigInt(1),
        date: compDate,
        symbol: 'XLK',
        rankScope: 'sectors',
        adjustedClose: 95,
        rsi14: 55,
        rsiPercentile: 60,
        maScore: 70,
        maScorePercentile: 65,
        distanceFromHighScore: 80,
        distanceFromHighScorePercentile: 70,
        rotationScore: 65,
        rotationRank: 1,
        rotationScoreDelta2W: 5,
        rankDelta2W: 2,
        maStatus: 'healthy_pullback',
        percentFromHigh: -5,
        signal: 'neutral',
        signalStatus: 'complete',
      },
    ])

    // Mock: pipeline returns results
    vi.mocked(runSnapshotPipeline).mockReturnValue({
      latest: [
        {
          symbol: 'XLK',
          rankScope: 'sectors',
          groupType: 'sector',
          sectorName: 'Technology',
          date: '2026-05-30',
          lastPrice: 160,
          adjustedClose: 160,
          dailyChangePct: 1.5,
          weeklyChangePct: 3.0,
          twoWeekPerformancePct: 5.2,
          twoWeekPerformancePercentile: 80,
          rsi14: 65,
          rsiPercentile: 70,
          rsiDelta2W: 10,
          ema10: 155,
          ema20: 150,
          sma50: 145,
          sma200: 130,
          above10d: true,
          above20d: true,
          above50d: true,
          above200d: true,
          maScore: 100,
          maScorePercentile: 90,
          maStatus: 'bullish_stack',
          rolling252dHigh: 165,
          percentFromHigh: -3,
          distanceFromHighScore: 85,
          distanceFromHighScorePercentile: 75,
          rotationScore: 78.5,
          rotationScoreDelta2W: 13.5,
          rotationRank: 1,
          rankDelta2W: 0,
          signal: 'turning_strong',
          signalStatus: 'complete',
        },
      ],
      snapshots: [],
      enriched: [],
    })

    // Mock: upsert returns count
    vi.mocked(upsertSnapshots).mockResolvedValue(1)

    const result = await runScopeBatch(prisma, 'sectors')

    expect(result.rankScope).toBe('sectors')
    expect(result.symbolCount).toBe(11) // 11 sector ETFs
    expect(result.upsertedCount).toBe(1)
    expect(result.comparisonDate).toEqual(compDate)
    expect(result.errors).toEqual([])

    // Verify pipeline was called with symbol prices
    expect(runSnapshotPipeline).toHaveBeenCalled()
    expect(getHistoricalPrices).toHaveBeenCalledWith(prisma, 'XLK', 252)
    expect(getComparisonWindow).toHaveBeenCalledWith(prisma, 'sectors', {
      candidate: {
        date: new Date('2099-09-17'),
        snapshotCount: 11,
      },
    })
    const [symbolPrices, comparisonSnaps] = vi.mocked(runSnapshotPipeline).mock.calls[0]
    expect(symbolPrices.length).toBeGreaterThan(0)
    expect(comparisonSnaps).toBeDefined()

    // Verify upsert was called
    expect(upsertSnapshots).toHaveBeenCalled()
  })

  it('continues when some symbols fail to load prices', async () => {
    const prisma = makePrisma()

    vi.mocked(getHistoricalPrices).mockImplementation(async (_p, symbol) => {
      if (symbol === 'XLU') throw new Error('DB error')
      return Array.from({ length: 260 }, (_, i) => {
        const d = new Date('2099-01-01')
        d.setDate(d.getDate() + i)
        return { date: d, close: 100 + i, adjustedClose: 100 + i }
      })
    })

    vi.mocked(getComparisonWindow).mockResolvedValue({
      rankScope: 'sectors',
      qualifiedDatesDesc: [],
      latestDate: null,
      comparisonDate: null,
    })
    vi.mocked(runSnapshotPipeline).mockReturnValue({
      latest: [],
      snapshots: [],
      enriched: [],
    })
    vi.mocked(upsertSnapshots).mockResolvedValue(0)

    const result = await runScopeBatch(prisma, 'sectors')

    expect(result.errors).toEqual([{ symbol: 'XLU', error: 'Error: DB error' }])
    expect(result.symbolCount).toBe(11)
  })

  it('runs without comparison data on first execution', async () => {
    const prisma = makePrisma()

    vi.mocked(getHistoricalPrices).mockResolvedValue([
      ...Array.from({ length: 260 }, (_, i) => {
        const d = new Date('2099-01-01')
        d.setDate(d.getDate() + i)
        return { date: d, close: 100 + i, adjustedClose: 100 + i }
      }),
    ])
    vi.mocked(getComparisonWindow).mockResolvedValue({
      rankScope: 'sectors',
      qualifiedDatesDesc: [],
      latestDate: null,
      comparisonDate: null,
    })
    vi.mocked(runSnapshotPipeline).mockReturnValue({
      latest: [{ symbol: 'XLK', signal: null, signalStatus: 'insufficient_data' }],
      snapshots: [],
      enriched: [],
    })
    vi.mocked(upsertSnapshots).mockResolvedValue(1)

    const result = await runScopeBatch(prisma, 'sectors')

    expect(result.comparisonDate).toBeNull()
    // Pipeline should have been called with empty comparison array
    const [, comparisonSnaps] = vi.mocked(runSnapshotPipeline).mock.calls[0]
    expect(comparisonSnaps).toEqual([])
  })
})

describe('ensureCanonicalPrices', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('backfills canonical prices for symbols missing market_daily_price before pipeline can read them', async () => {
    const prisma = makePrisma()
    vi.mocked(getHistoricalPrices).mockResolvedValue([])
    const yahooClient = {
      chart: vi.fn().mockResolvedValue({
        quotes: [
          {
            date: new Date('2026-06-10T00:00:00.000Z'),
            open: 100,
            high: 105,
            low: 99,
            close: 104,
            adjclose: 103,
            volume: 1234,
          },
        ],
      }),
    }

    await ensureCanonicalPrices(prisma, ['XLK'], yahooClient)

    expect(yahooClient.chart).toHaveBeenCalledWith('XLK', expect.objectContaining({
      interval: '1d',
      return: 'array',
    }))
    expect(prisma.marketDailyPrice.upsert).toHaveBeenCalledWith({
      where: {
        symbol_date: {
          symbol: 'XLK',
          date: new Date('2026-06-10T00:00:00.000Z'),
        },
      },
      update: {
        open: 100,
        high: 105,
        low: 99,
        close: 104,
        adjustedClose: 103,
        volume: 1234n,
      },
      create: {
        symbol: 'XLK',
        date: new Date('2026-06-10T00:00:00.000Z'),
        open: 100,
        high: 105,
        low: 99,
        close: 104,
        adjustedClose: 103,
        volume: 1234n,
      },
    })
  })

  it('backfills when existing prices have insufficient lookback', async () => {
    const prisma = makePrisma()
    vi.mocked(getHistoricalPrices).mockResolvedValue(
      Array.from({ length: 40 }, (_, i) => {
        const d = new Date('2026-05-01')
        d.setDate(d.getDate() + i)
        return { date: d, close: 100 + i, adjustedClose: 100 + i }
      }),
    )
    const yahooClient = {
      chart: vi.fn().mockResolvedValue({ quotes: [] }),
    }

    await ensureCanonicalPrices(prisma, ['XLK'], yahooClient, {
      now: new Date('2026-06-13T00:00:00.000Z'),
    })

    expect(yahooClient.chart).toHaveBeenCalled()
  })

  it('backfills when existing prices are stale', async () => {
    const prisma = makePrisma()
    vi.mocked(getHistoricalPrices).mockResolvedValue(
      Array.from({ length: 260 }, (_, i) => {
        const d = new Date('2025-08-01')
        d.setDate(d.getDate() + i)
        return { date: d, close: 100 + i, adjustedClose: 100 + i }
      }),
    )
    const yahooClient = {
      chart: vi.fn().mockResolvedValue({ quotes: [] }),
    }

    await ensureCanonicalPrices(prisma, ['XLK'], yahooClient, {
      now: new Date('2026-06-13T00:00:00.000Z'),
      staleAfterDays: 7,
    })

    expect(yahooClient.chart).toHaveBeenCalled()
  })

  it('does not fetch when a symbol has enough fresh market_daily_price rows', async () => {
    const prisma = makePrisma()
    vi.mocked(getHistoricalPrices).mockResolvedValue(
      Array.from({ length: 260 }, (_, i) => {
        const d = new Date('2025-09-24')
        d.setDate(d.getDate() + i)
        return { date: d, close: 100 + i, adjustedClose: 100 + i }
      }),
    )
    const yahooClient = {
      chart: vi.fn(),
    }

    await ensureCanonicalPrices(prisma, ['XLK'], yahooClient, {
      now: new Date('2026-06-13T00:00:00.000Z'),
    })

    expect(yahooClient.chart).not.toHaveBeenCalled()
    expect(prisma.marketDailyPrice.upsert).not.toHaveBeenCalled()
  })
})

describe('runFullBatch', () => {
  it('runs batch for all three scopes', async () => {
    const prisma = makePrisma()

    vi.mocked(getHistoricalPrices).mockResolvedValue([
      ...Array.from({ length: 260 }, (_, i) => {
        const d = new Date('2099-01-01')
        d.setDate(d.getDate() + i)
        return { date: d, close: 100 + i, adjustedClose: 100 + i }
      }),
    ])
    vi.mocked(getComparisonWindow).mockResolvedValue({
      rankScope: 'sectors',
      qualifiedDatesDesc: [],
      latestDate: null,
      comparisonDate: null,
    })
    vi.mocked(runSnapshotPipeline).mockReturnValue({
      latest: [{ symbol: 'TEST', signal: null, signalStatus: 'insufficient_data' }],
      snapshots: [],
      enriched: [],
    })
    vi.mocked(upsertSnapshots).mockResolvedValue(1)

    const result = await runFullBatch(prisma)

    expect(result.results).toHaveLength(3)
    expect(result.results.map(r => r.rankScope)).toEqual(['sectors', 'indexes', 'core'])
    expect(result.totalUpserted).toBe(3) // 1 per scope
    expect(result.totalErrors).toBe(0)
  })
})
