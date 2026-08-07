import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks ---
const {
  mockMarketDailyPriceFindMany,
  mockMarketRotationSnapshotGroupBy,
  mockMarketRotationSnapshotFindMany,
  mockMarketRotationSnapshotFindFirst,
  mockMarketRotationSnapshotUpsert,
} = vi.hoisted(() => ({
  mockMarketDailyPriceFindMany: vi.fn(),
  mockMarketRotationSnapshotGroupBy: vi.fn(),
  mockMarketRotationSnapshotFindMany: vi.fn(),
  mockMarketRotationSnapshotFindFirst: vi.fn(),
  mockMarketRotationSnapshotUpsert: vi.fn(),
}))

// Create a mock prisma object that will be passed as argument
function createMockPrisma() {
  return {
    marketDailyPrice: {
      findMany: mockMarketDailyPriceFindMany,
    },
    marketRotationSnapshot: {
      groupBy: mockMarketRotationSnapshotGroupBy,
      findMany: mockMarketRotationSnapshotFindMany,
      findFirst: mockMarketRotationSnapshotFindFirst,
      upsert: mockMarketRotationSnapshotUpsert,
    },
  }
}

// --- Import SUT after mocks ---
import {
  getHistoricalPrices,
  getLatestQualifiedDate,
  getComparisonWindow,
  getComparisonDate,
  getComparisonSnapshots,
  upsertSnapshots,
} from '~/server/utils/market-rotation-queries'

describe('server/utils/market-rotation-queries', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = createMockPrisma()
  })

  // ─── getHistoricalPrices ────────────────────────────────────────────────

  describe('getHistoricalPrices', () => {
    it('calls prisma.marketDailyPrice.findMany with correct where/order/limit', async () => {
      mockMarketDailyPriceFindMany.mockResolvedValue([])

      await getHistoricalPrices(prisma as any, 'SPY')

      expect(mockMarketDailyPriceFindMany).toHaveBeenCalledWith({
        where: { symbol: 'SPY' },
        orderBy: { date: 'desc' },
        take: 300,
        select: {
          date: true,
          close: true,
          adjustedClose: true,
        },
      })
    })

    it('uses custom limit when provided', async () => {
      mockMarketDailyPriceFindMany.mockResolvedValue([])

      await getHistoricalPrices(prisma as any, 'QQQ', 50)

      expect(mockMarketDailyPriceFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 50 }),
      )
    })

    it('returns rows sorted by date ascending with Decimal converted to number', async () => {
      // Simulate Prisma returning rows in desc order (most recent first)
      const prismaRows = [
        {
          date: new Date('2026-06-10'),
          close: { toNumber: () => 530.25 },
          adjustedClose: { toNumber: () => 529.80 },
        },
        {
          date: new Date('2026-06-09'),
          close: { toNumber: () => 528.10 },
          adjustedClose: { toNumber: () => 527.65 },
        },
        {
          date: new Date('2026-06-08'),
          close: { toNumber: () => 525.00 },
          adjustedClose: { toNumber: () => 524.55 },
        },
      ]
      mockMarketDailyPriceFindMany.mockResolvedValue(prismaRows)

      const result = await getHistoricalPrices(prisma as any, 'SPY')

      // Result should be reversed to ascending order
      expect(result).toHaveLength(3)
      expect(result[0].date).toEqual(new Date('2026-06-08'))
      expect(result[0].close).toBe(525.00)
      expect(result[0].adjustedClose).toBe(524.55)
      expect(result[2].date).toEqual(new Date('2026-06-10'))
      expect(result[2].close).toBe(530.25)
    })

    it('handles numeric close values (non-Decimal)', async () => {
      mockMarketDailyPriceFindMany.mockResolvedValue([
        {
          date: new Date('2026-06-10'),
          close: 100.5,
          adjustedClose: 100.2,
        },
      ])

      const result = await getHistoricalPrices(prisma as any, 'TEST')

      expect(result[0].close).toBe(100.5)
      expect(result[0].adjustedClose).toBe(100.2)
    })

    it('returns empty array when no data found', async () => {
      mockMarketDailyPriceFindMany.mockResolvedValue([])

      const result = await getHistoricalPrices(prisma as any, 'NONEXIST')

      expect(result).toEqual([])
    })
  })

  // ─── getLatestQualifiedDate ─────────────────────────────────────────────

  describe('getLatestQualifiedDate', () => {
    it('returns date when >= 90% symbols have snapshots', async () => {
      // 10 symbols, threshold = ceil(10 * 0.9) = 9
      // Latest date with >= 9 symbols is 2026-06-10
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-10'), _count: { symbol: 10 } },
        { date: new Date('2026-06-09'), _count: { symbol: 9 } },
        { date: new Date('2026-06-08'), _count: { symbol: 10 } },
      ])

      const result = await getLatestQualifiedDate(
        prisma as any,
        'SP500',
        ['SPY', 'QQQ', 'IWM', 'DIA', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP'],
      )

      expect(result).toEqual(new Date('2026-06-10'))
      expect(mockMarketRotationSnapshotGroupBy).toHaveBeenCalledWith({
        by: ['date'],
        where: {
          rankScope: 'SP500',
          symbol: { in: ['SPY', 'QQQ', 'IWM', 'DIA', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP'] },
        },
        _count: { symbol: true },
        orderBy: { date: 'desc' },
      })
    })

    it('skips dates with < 90% coverage and returns next qualified date', async () => {
      // 10 symbols, threshold = 9
      // 2026-06-10 has 8 (not enough), 2026-06-09 has 10 (enough)
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-10'), _count: { symbol: 8 } },
        { date: new Date('2026-06-09'), _count: { symbol: 10 } },
      ])

      const result = await getLatestQualifiedDate(
        prisma as any,
        'SP500',
        ['SPY', 'QQQ', 'IWM', 'DIA', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP'],
      )

      expect(result).toEqual(new Date('2026-06-09'))
    })

    it('returns null when no qualified dates exist', async () => {
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-10'), _count: { symbol: 3 } },
        { date: new Date('2026-06-09'), _count: { symbol: 5 } },
      ])

      const result = await getLatestQualifiedDate(
        prisma as any,
        'SP500',
        ['SPY', 'QQQ', 'IWM', 'DIA', 'XLK', 'XLF', 'XLE', 'XLV', 'XLY', 'XLP'],
      )

      expect(result).toBeNull()
    })

    it('returns null when groupBy returns empty', async () => {
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([])

      const result = await getLatestQualifiedDate(prisma as any, 'SP500', ['SPY'])

      expect(result).toBeNull()
    })

    it('handles single symbol correctly (threshold = 1)', async () => {
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-10'), _count: { symbol: 1 } },
      ])

      const result = await getLatestQualifiedDate(prisma as any, 'TEST', ['SPY'])

      expect(result).toEqual(new Date('2026-06-10'))
    })
  })

  // ─── getComparisonDate ──────────────────────────────────────────────────

  describe('getComparisonDate', () => {
    it('returns the date at offset position from qualified dates (desc)', async () => {
      // offset=10 means get the 11th most recent qualified date
      // sectors has 11 canonical symbols, threshold = ceil(11*0.9) = 10
      const dates = Array.from({ length: 15 }, (_, i) => ({
        date: new Date(`2026-06-${String(15 - i).padStart(2, '0')}`),
        _count: { symbol: 11 },
      }))
      mockMarketRotationSnapshotGroupBy.mockResolvedValue(dates)

      const result = await getComparisonDate(prisma as any, 'sectors', 10)

      // offset=10 → 11th item (0-indexed), which is 2026-06-05
      expect(result).toEqual(new Date('2026-06-05'))
    })

    it('skips dates below 90% scope coverage when selecting the offset date', async () => {
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-15'), _count: { symbol: 11 } },
        { date: new Date('2026-06-14'), _count: { symbol: 9 } },
        { date: new Date('2026-06-13'), _count: { symbol: 10 } },
        { date: new Date('2026-06-12'), _count: { symbol: 8 } },
        { date: new Date('2026-06-11'), _count: { symbol: 11 } },
      ])

      const result = await getComparisonDate(prisma as any, 'sectors', 2)

      expect(result).toEqual(new Date('2026-06-11'))
    })

    it('returns null when offset exceeds available dates', async () => {
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-10'), _count: { symbol: 11 } },
        { date: new Date('2026-06-09'), _count: { symbol: 11 } },
      ])

      const result = await getComparisonDate(prisma as any, 'sectors', 5)

      expect(result).toBeNull()
    })

    it('returns null when no qualified dates', async () => {
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([])

      const result = await getComparisonDate(prisma as any, 'sectors', 0)

      expect(result).toBeNull()
    })

    it('offset=0 returns the most recent qualified date', async () => {
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-10'), _count: { symbol: 11 } },
        { date: new Date('2026-06-09'), _count: { symbol: 11 } },
      ])

      const result = await getComparisonDate(prisma as any, 'sectors', 0)

      expect(result).toEqual(new Date('2026-06-10'))
    })

    it('passes the canonical universe symbols into the groupBy filter (ADR-0004)', async () => {
      // sectors scope has 11 canonical symbols; threshold = ceil(11*0.9) = 10.
      mockMarketRotationSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-10'), _count: { symbol: 11 } },
      ])

      await getComparisonDate(prisma as any, 'sectors', 0)

      // The groupBy must filter by symbol: { in: canonicalUniverse } so
      // stale / non-canonical rows cannot inflate coverage.
      expect(mockMarketRotationSnapshotGroupBy).toHaveBeenCalledWith({
        by: ['date'],
        where: {
          rankScope: 'sectors',
          symbol: {
            in: [
              'XLK', 'XLF', 'XLE', 'XLU', 'XLP', 'XLY', 'XLI',
              'XLV', 'XLB', 'XLC', 'XLRE',
            ],
          },
        },
        _count: { symbol: true },
        orderBy: { date: 'desc' },
      })
    })

    it('excludes non-canonical symbols from qualified-date coverage (ADR-0004)', async () => {
      // DB has 9 canonical rows + 5 stale 'OLD' rows on 2026-06-14.
      // Without the symbol filter, groupBy would count 14 rows ≥ 10
      // (threshold for 11-symbol universe) and falsely qualify the date.
      // With the filter, only 9 canonical rows count → below threshold.
      mockMarketRotationSnapshotGroupBy.mockImplementation(async (args: { where?: { symbol?: { in?: string[] } } }) => {
        const filtered = !!args.where?.symbol?.in
        return [
          { date: new Date('2026-06-15'), _count: { symbol: filtered ? 11 : 16 } },
          { date: new Date('2026-06-14'), _count: { symbol: filtered ? 9 : 14 } },
          { date: new Date('2026-06-13'), _count: { symbol: filtered ? 11 : 16 } },
        ]
      })

      // offset=1 → second qualified date. Without the canonical filter,
      // 2026-06-14 would qualify (14 rows ≥ 10 threshold) and offset=1
      // would return 2026-06-14. With the filter, only 2026-06-15 and
      // 2026-06-13 qualify, so offset=1 returns 2026-06-13 — proving
      // 2026-06-14 is excluded.
      const result = await getComparisonDate(prisma as any, 'sectors', 1)

      expect(result).toEqual(new Date('2026-06-13'))
    })

    it('uses the same 2W boundary before and after a new qualified snapshot is persisted', async () => {
      const newSnapshotDate = new Date('2026-06-15')
      const existingDates = Array.from({ length: 10 }, (_, index) => ({
        date: new Date(`2026-06-${String(14 - index).padStart(2, '0')}`),
        _count: { symbol: 11 },
      }))

      // Before persistence, the candidate date is supplied explicitly. It
      // must occupy position 0 before offset 10 is applied.
      mockMarketRotationSnapshotGroupBy.mockResolvedValueOnce(existingDates)
      const beforePersistence = await getComparisonWindow(prisma as any, 'sectors', {
        candidate: { date: newSnapshotDate, snapshotCount: 11 },
      })

      // After persistence, the same date is returned by groupBy naturally.
      mockMarketRotationSnapshotGroupBy.mockResolvedValueOnce([
        { date: newSnapshotDate, _count: { symbol: 11 } },
        ...existingDates,
      ])
      const afterPersistence = await getComparisonWindow(prisma as any, 'sectors')

      expect(beforePersistence.qualifiedDatesDesc).toHaveLength(11)
      expect(beforePersistence.latestDate).toEqual(newSnapshotDate)
      expect(beforePersistence.comparisonDate).toEqual(new Date('2026-06-05'))
      expect(afterPersistence.comparisonDate).toEqual(beforePersistence.comparisonDate)
    })
  })

  // ─── getComparisonSnapshots ─────────────────────────────────────────────

  describe('getComparisonSnapshots', () => {
    it('calls prisma with correct where clause for rankScope and date', async () => {
      mockMarketRotationSnapshotFindMany.mockResolvedValue([])

      const targetDate = new Date('2026-05-28')
      await getComparisonSnapshots(prisma as any, 'SP500', targetDate)

      expect(mockMarketRotationSnapshotFindMany).toHaveBeenCalledWith({
        where: {
          rankScope: 'SP500',
          date: targetDate,
        },
      })
    })

    it('returns rows with rotationScore/rotationRank converted from Decimal', async () => {
      mockMarketRotationSnapshotFindMany.mockResolvedValue([
        {
          id: 1n,
          date: new Date('2026-05-28'),
          symbol: 'SPY',
          rankScope: 'SP500',
          rotationScore: { toNumber: () => 85.5 },
          rotationRank: 1,
          rotationScoreDelta2W: { toNumber: () => 3.2 },
          rankDelta2W: -2,
          signal: 'STRONG_BUY',
          signalStatus: 'ACTIVE',
        },
        {
          id: 2n,
          date: new Date('2026-05-28'),
          symbol: 'QQQ',
          rankScope: 'SP500',
          rotationScore: { toNumber: () => 72.0 },
          rotationRank: 3,
          rotationScoreDelta2W: { toNumber: () => -1.5 },
          rankDelta2W: 1,
          signal: 'BUY',
          signalStatus: 'ACTIVE',
        },
      ])

      const result = await getComparisonSnapshots(
        prisma as any,
        'SP500',
        new Date('2026-05-28'),
      )

      expect(result).toHaveLength(2)
      expect(result[0].symbol).toBe('SPY')
      expect(result[0].rotationScore).toBe(85.5)
      expect(result[0].rotationRank).toBe(1)
      expect(result[0].rotationScoreDelta2W).toBe(3.2)
      expect(result[0].rankDelta2W).toBe(-2)
      expect(result[1].symbol).toBe('QQQ')
      expect(result[1].rotationScore).toBe(72.0)
    })

    it('handles null Decimal fields correctly', async () => {
      mockMarketRotationSnapshotFindMany.mockResolvedValue([
        {
          id: 1n,
          date: new Date('2026-05-28'),
          symbol: 'SPY',
          rankScope: 'SP500',
          rotationScore: null,
          rotationRank: null,
          rotationScoreDelta2W: null,
          rankDelta2W: null,
          signal: null,
          signalStatus: 'PENDING',
        },
      ])

      const result = await getComparisonSnapshots(
        prisma as any,
        'SP500',
        new Date('2026-05-28'),
      )

      expect(result[0].rotationScore).toBeNull()
      expect(result[0].rotationRank).toBeNull()
    })

    it('returns empty array when no snapshots found for date', async () => {
      mockMarketRotationSnapshotFindMany.mockResolvedValue([])

      const result = await getComparisonSnapshots(
        prisma as any,
        'SP500',
        new Date('2026-01-01'),
      )

      expect(result).toEqual([])
    })
  })

  // ─── upsertSnapshots ────────────────────────────────────────────────────

  describe('upsertSnapshots', () => {
    it('calls upsert for each snapshot with correct composite key', async () => {
      mockMarketRotationSnapshotUpsert.mockResolvedValue({ id: 1n })

      const snapshots = [
        {
          date: new Date('2026-06-10'),
          symbol: 'SPY',
          rankScope: 'SP500',
          groupType: 'ETF',
          sectorName: null,
          lastPrice: 530.25,
          adjustedClose: 529.80,
          dailyChangePct: 0.5,
          weeklyChangePct: 1.2,
          twoWeekPerformancePct: 2.5,
          rsi14: 65.3,
          rsiPercentile: 72.0,
          rsiDelta2W: 3.1,
          ema10: 525.0,
          ema20: 520.0,
          sma50: 510.0,
          sma200: 490.0,
          above10d: true,
          above20d: true,
          above50d: true,
          above200d: true,
          maScore: 4,
          maScorePercentile: 85.0,
          maStatus: 'BULLISH',
          rolling252dHigh: 550.0,
          percentFromHigh: -3.6,
          distanceFromHighScore: 88.0,
          distanceFromHighScorePercentile: 75.0,
          rotationScore: 85.5,
          rotationScoreDelta2W: 3.2,
          rotationRank: 1,
          rankDelta2W: -2,
          signal: 'STRONG_BUY',
          signalStatus: 'ACTIVE',
        },
        {
          date: new Date('2026-06-10'),
          symbol: 'QQQ',
          rankScope: 'SP500',
          groupType: 'ETF',
          sectorName: null,
          lastPrice: 450.0,
          adjustedClose: 449.5,
          dailyChangePct: -0.3,
          weeklyChangePct: 0.8,
          twoWeekPerformancePct: 1.5,
          rsi14: 55.0,
          rsiPercentile: 50.0,
          rsiDelta2W: -2.0,
          ema10: 445.0,
          ema20: 440.0,
          sma50: 430.0,
          sma200: 420.0,
          above10d: true,
          above20d: true,
          above50d: true,
          above200d: true,
          maScore: 4,
          maScorePercentile: 80.0,
          maStatus: 'BULLISH',
          rolling252dHigh: 460.0,
          percentFromHigh: -2.2,
          distanceFromHighScore: 90.0,
          distanceFromHighScorePercentile: 78.0,
          rotationScore: 72.0,
          rotationScoreDelta2W: -1.5,
          rotationRank: 3,
          rankDelta2W: 1,
          signal: 'BUY',
          signalStatus: 'ACTIVE',
        },
      ]

      const count = await upsertSnapshots(prisma as any, snapshots)

      expect(count).toBe(2)
      expect(mockMarketRotationSnapshotUpsert).toHaveBeenCalledTimes(2)

      // Verify first upsert call uses unique composite key
      expect(mockMarketRotationSnapshotUpsert).toHaveBeenNthCalledWith(1, {
        where: {
          rankScope_symbol_date: {
            rankScope: 'SP500',
            symbol: 'SPY',
            date: new Date('2026-06-10'),
          },
        },
        update: expect.objectContaining({
          lastPrice: 530.25,
          rotationScore: 85.5,
          rotationRank: 1,
        }),
        create: expect.objectContaining({
          date: new Date('2026-06-10'),
          symbol: 'SPY',
          rankScope: 'SP500',
          rotationScore: 85.5,
          rotationRank: 1,
        }),
      })
    })

    it('returns 0 for empty snapshots array', async () => {
      const count = await upsertSnapshots(prisma as any, [])

      expect(count).toBe(0)
      expect(mockMarketRotationSnapshotUpsert).not.toHaveBeenCalled()
    })

    it('handles null optional fields in snapshots', async () => {
      mockMarketRotationSnapshotUpsert.mockResolvedValue({ id: 1n })

      const snapshots = [
        {
          date: new Date('2026-06-10'),
          symbol: 'TEST',
          rankScope: 'SP500',
          groupType: 'ETF',
          sectorName: null,
          lastPrice: null,
          adjustedClose: null,
          dailyChangePct: null,
          weeklyChangePct: null,
          twoWeekPerformancePct: null,
          rsi14: null,
          rsiPercentile: null,
          rsiDelta2W: null,
          ema10: null,
          ema20: null,
          sma50: null,
          sma200: null,
          above10d: null,
          above20d: null,
          above50d: null,
          above200d: null,
          maScore: null,
          maScorePercentile: null,
          maStatus: null,
          rolling252dHigh: null,
          percentFromHigh: null,
          distanceFromHighScore: null,
          distanceFromHighScorePercentile: null,
          rotationScore: null,
          rotationScoreDelta2W: null,
          rotationRank: null,
          rankDelta2W: null,
          signal: null,
          signalStatus: 'PENDING',
        },
      ]

      const count = await upsertSnapshots(prisma as any, snapshots)

      expect(count).toBe(1)
      expect(mockMarketRotationSnapshotUpsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            signalStatus: 'PENDING',
          }),
        }),
      )
    })
  })
})
