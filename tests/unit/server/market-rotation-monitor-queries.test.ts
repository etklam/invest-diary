import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks ---
const {
  mockSnapshotFindFirst,
  mockSnapshotFindMany,
  mockSnapshotGroupBy,
  mockBreadthFindFirst,
} = vi.hoisted(() => ({
  mockSnapshotFindFirst: vi.fn(),
  mockSnapshotFindMany: vi.fn(),
  mockSnapshotGroupBy: vi.fn(),
  mockBreadthFindFirst: vi.fn(),
}))

function createMockPrisma() {
  return {
    marketRotationSnapshot: {
      findFirst: mockSnapshotFindFirst,
      findMany: mockSnapshotFindMany,
      groupBy: mockSnapshotGroupBy,
    },
    marketBreadthDaily: {
      findFirst: mockBreadthFindFirst,
    },
  }
}

// --- Import SUT after mocks ---
import {
  getLatestMonitorRows,
  resolveMarketState,
  getMonitorTrendSeries,
} from '~/server/utils/market-rotation-monitor-queries'

// --- Helpers ---

/** Create a Decimal-like mock object that Prisma would return */
function dec(value: number) {
  return { toNumber: () => value }
}

/** Build a raw Prisma snapshot row for sectors scope */
function buildSectorRawRow(overrides: Partial<Record<string, unknown>> = {}) {
  return {
    id: 1n,
    date: new Date('2026-06-10'),
    symbol: 'XLK',
    rankScope: 'sectors',
    groupType: 'sector',
    sectorName: 'Technology',
    lastPrice: dec(210.50),
    adjustedClose: dec(210.30),
    dailyChangePct: dec(0.5),
    weeklyChangePct: dec(1.2),
    twoWeekPerformancePct: dec(2.5),
    rsi14: dec(65.3),
    rsiPercentile: dec(72.0),
    rsiDelta2W: dec(3.1),
    ema10: dec(208.0),
    ema20: dec(205.0),
    sma50: dec(200.0),
    sma200: dec(190.0),
    above10d: true,
    above20d: true,
    above50d: true,
    above200d: true,
    maScore: 4,
    maScorePercentile: dec(85.0),
    maStatus: 'bullish_stack',
    rolling252dHigh: dec(220.0),
    percentFromHigh: dec(-4.3),
    distanceFromHighScore: dec(88.0),
    distanceFromHighScorePercentile: dec(75.0),
    rotationScore: dec(85.5),
    rotationScoreDelta2W: dec(3.2),
    rotationRank: 1,
    rankDelta2W: -2,
    signal: 'turning_strong',
    signalStatus: 'complete',
    ...overrides,
  }
}

describe('server/utils/market-rotation-monitor-queries', () => {
  let prisma: ReturnType<typeof createMockPrisma>

  beforeEach(() => {
    vi.clearAllMocks()
    prisma = createMockPrisma()
  })

  // ─── getLatestMonitorRows ────────────────────────────────────────────────

  describe('getLatestMonitorRows', () => {
    it('reads the latest date snapshots and returns monitor rows', async () => {
      mockSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-11'), _count: { symbol: 9 } },
        { date: new Date('2026-06-10'), _count: { symbol: 10 } },
      ])
      mockSnapshotFindMany.mockResolvedValue([
        buildSectorRawRow({ symbol: 'XLK', sectorName: 'Technology', rotationRank: 1 }),
        buildSectorRawRow({
          id: 2n,
          symbol: 'XLF',
          sectorName: 'Financials',
          rotationRank: 2,
          rotationScore: dec(72.0),
        }),
      ])

      const result = await getLatestMonitorRows(prisma as any, 'sectors')

      expect(mockSnapshotGroupBy).toHaveBeenCalledWith({
        by: ['date'],
        where: {
          rankScope: 'sectors',
          symbol: {
            in: ['XLK', 'XLF', 'XLE', 'XLU', 'XLP', 'XLY', 'XLI', 'XLV', 'XLB', 'XLC', 'XLRE'],
          },
        },
        _count: { symbol: true },
        orderBy: { date: 'desc' },
      })
      expect(mockSnapshotFindMany).toHaveBeenCalledWith({
        where: {
          rankScope: 'sectors',
          date: new Date('2026-06-10'),
          symbol: {
            in: ['XLK', 'XLF', 'XLE', 'XLU', 'XLP', 'XLY', 'XLI', 'XLV', 'XLB', 'XLC', 'XLRE'],
          },
        },
      })

      expect(result.rows).toHaveLength(2)
      expect(result.asOfDate).toEqual(new Date('2026-06-10'))
    })

    it('uses the latest qualified snapshot date instead of the latest raw date', async () => {
      mockSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-12'), _count: { symbol: 1 } },
        { date: new Date('2026-06-11'), _count: { symbol: 9 } },
        { date: new Date('2026-06-10'), _count: { symbol: 10 } },
      ])
      mockSnapshotFindMany.mockResolvedValue([buildSectorRawRow()])

      const result = await getLatestMonitorRows(prisma as any, 'sectors')

      expect(result.asOfDate).toEqual(new Date('2026-06-10'))
      expect(mockSnapshotFindMany).toHaveBeenCalledWith({
        where: {
          rankScope: 'sectors',
          date: new Date('2026-06-10'),
          symbol: {
            in: ['XLK', 'XLF', 'XLE', 'XLU', 'XLP', 'XLY', 'XLI', 'XLV', 'XLB', 'XLC', 'XLRE'],
          },
        },
      })
      expect(mockSnapshotFindFirst).not.toHaveBeenCalled()
    })

    it('converts Decimal fields to number', async () => {
      mockSnapshotGroupBy.mockResolvedValue([{ date: new Date('2026-06-10'), _count: { symbol: 11 } }])
      mockSnapshotFindMany.mockResolvedValue([buildSectorRawRow()])

      const result = await getLatestMonitorRows(prisma as any, 'sectors')

      const row = result.rows[0]
      expect(row.lastPrice).toBe(210.50)
      expect(row.rsi14).toBe(65.3)
      expect(row.percentFromHigh).toBe(-4.3)
      expect(row.rotationScore).toBe(85.5)
      expect(row.rotationScoreDelta2W).toBe(3.2)
      expect(row.twoWeekPerformancePct).toBe(2.5)
      expect(row.rsiDelta2W).toBe(3.1)
    })

    it('adds name from universe mapping (XLK -> Technology)', async () => {
      mockSnapshotGroupBy.mockResolvedValue([{ date: new Date('2026-06-10'), _count: { symbol: 11 } }])
      mockSnapshotFindMany.mockResolvedValue([
        buildSectorRawRow({ symbol: 'XLK' }),
        buildSectorRawRow({ id: 2n, symbol: 'XLF', sectorName: 'Financials' }),
      ])

      const result = await getLatestMonitorRows(prisma as any, 'sectors')

      expect(result.rows[0].symbol).toBe('XLK')
      expect(result.rows[0].name).toBe('Technology')
      expect(result.rows[1].symbol).toBe('XLF')
      expect(result.rows[1].name).toBe('Financials')
    })

    it('returns empty rows and null asOfDate for empty database', async () => {
      mockSnapshotGroupBy.mockResolvedValue([])

      const result = await getLatestMonitorRows(prisma as any, 'sectors')

      expect(result.rows).toEqual([])
      expect(result.asOfDate).toBeNull()
      // findMany should not be called
      expect(mockSnapshotFindMany).not.toHaveBeenCalled()
    })

    it('correctly maps groupType from DB row', async () => {
      mockSnapshotGroupBy.mockResolvedValue([{ date: new Date('2026-06-10'), _count: { symbol: 11 } }])
      mockSnapshotFindMany.mockResolvedValue([
        buildSectorRawRow({ symbol: 'XLK', groupType: 'sector' }),
        buildSectorRawRow({ id: 2n, symbol: 'SPY', groupType: 'index', rankScope: 'indexes' }),
      ])

      const result = await getLatestMonitorRows(prisma as any, 'sectors')

      expect(result.rows[0].groupType).toBe('sector')
      expect(result.rows[1].groupType).toBe('index')
    })

    it('handles indexes scope with correct name mapping', async () => {
      mockSnapshotGroupBy.mockResolvedValue([{ date: new Date('2026-06-10'), _count: { symbol: 11 } }])
      mockSnapshotFindMany.mockResolvedValue([
        buildSectorRawRow({
          symbol: 'SPY',
          groupType: 'index',
          rankScope: 'indexes',
          sectorName: null,
        }),
      ])

      const result = await getLatestMonitorRows(prisma as any, 'indexes')

      expect(result.rows[0].symbol).toBe('SPY')
      expect(result.rows[0].name).toBe('S&P 500')
      expect(result.rows[0].groupType).toBe('index')
      expect(result.rows[0].sectorName).toBeNull()
    })

    it('handles null Decimal fields correctly', async () => {
      mockSnapshotGroupBy.mockResolvedValue([{ date: new Date('2026-06-10'), _count: { symbol: 11 } }])
      mockSnapshotFindMany.mockResolvedValue([
        buildSectorRawRow({
          lastPrice: null,
          rsi14: null,
          percentFromHigh: null,
          rotationScore: null,
          rotationScoreDelta2W: null,
          rotationRank: null,
          rankDelta2W: null,
          rsiDelta2W: null,
          twoWeekPerformancePct: null,
          above20d: null,
          above50d: null,
          signal: null,
          signalStatus: 'insufficient_data',
        }),
      ])

      const result = await getLatestMonitorRows(prisma as any, 'sectors')

      const row = result.rows[0]
      expect(row.lastPrice).toBeNull()
      expect(row.rsi14).toBeNull()
      expect(row.percentFromHigh).toBeNull()
      expect(row.rotationScore).toBeNull()
      expect(row.rotationScoreDelta2W).toBeNull()
      expect(row.rotationRank).toBeNull()
      expect(row.rankDelta2W).toBeNull()
      expect(row.rsiDelta2W).toBeNull()
      expect(row.twoWeekPerformancePct).toBeNull()
      expect(row.above20d).toBeNull()
      expect(row.above50d).toBeNull()
      expect(row.signal).toBeNull()
      expect(row.signalStatus).toBe('insufficient_data')
    })
  })

  // ─── resolveMarketState ──────────────────────────────────────────────────

  describe('resolveMarketState', () => {
    it('returns risk_on when market_breadth_daily has regime RISK_ON', async () => {
      mockBreadthFindFirst.mockResolvedValue({
        universeKey: 'SP500_NDX',
        date: new Date('2026-06-10'),
        regime: 'RISK_ON',
      })

      const result = await resolveMarketState(prisma as any)

      expect(result).toBe('risk_on')
      expect(mockBreadthFindFirst).toHaveBeenCalledWith({
        where: { universeKey: 'SP500_NDX' },
        orderBy: { date: 'desc' },
        select: { regime: true },
      })
    })

    it('returns risk_on for BULLISH_THRUST regime', async () => {
      mockBreadthFindFirst.mockResolvedValue({
        universeKey: 'SP500_NDX',
        date: new Date('2026-06-10'),
        regime: 'BULLISH_THRUST',
      })

      const result = await resolveMarketState(prisma as any)

      expect(result).toBe('risk_on')
    })

    it('returns neutral for NEUTRAL regime', async () => {
      mockBreadthFindFirst.mockResolvedValue({
        universeKey: 'SP500_NDX',
        date: new Date('2026-06-10'),
        regime: 'NEUTRAL',
      })

      const result = await resolveMarketState(prisma as any)

      expect(result).toBe('neutral')
    })

    it('returns defensive for RISK_OFF regime', async () => {
      mockBreadthFindFirst.mockResolvedValue({
        universeKey: 'SP500_NDX',
        date: new Date('2026-06-10'),
        regime: 'RISK_OFF',
      })

      const result = await resolveMarketState(prisma as any)

      expect(result).toBe('defensive')
    })

    it('returns risk_off for CAPITULATION_WATCH regime', async () => {
      mockBreadthFindFirst.mockResolvedValue({
        universeKey: 'SP500_NDX',
        date: new Date('2026-06-10'),
        regime: 'CAPITULATION_WATCH',
      })

      const result = await resolveMarketState(prisma as any)

      expect(result).toBe('risk_off')
    })

    it('returns unknown when regime is null', async () => {
      mockBreadthFindFirst.mockResolvedValue({
        universeKey: 'SP500_NDX',
        date: new Date('2026-06-10'),
        regime: null,
      })

      const result = await resolveMarketState(prisma as any)

      expect(result).toBe('unknown')
    })

    it('returns unknown when no breadth data exists', async () => {
      mockBreadthFindFirst.mockResolvedValue(null)

      const result = await resolveMarketState(prisma as any)

      expect(result).toBe('unknown')
    })
  })

  // ─── getMonitorTrendSeries ───────────────────────────────────────────────

  describe('getMonitorTrendSeries', () => {
    it('builds comparison-date-normalized sparklines on qualified scope dates', async () => {
      mockSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-15'), _count: { symbol: 11 } },
        { date: new Date('2026-06-14'), _count: { symbol: 9 } },
        { date: new Date('2026-06-13'), _count: { symbol: 10 } },
      ])
      mockSnapshotFindMany.mockResolvedValue([
        { symbol: 'XLK', date: new Date('2026-06-13'), adjustedClose: dec(100), lastPrice: dec(101) },
        { symbol: 'XLK', date: new Date('2026-06-15'), adjustedClose: dec(110), lastPrice: dec(111) },
        { symbol: 'XLF', date: new Date('2026-06-13'), adjustedClose: dec(50), lastPrice: dec(50) },
      ])

      const result = await getMonitorTrendSeries(
        prisma as any,
        'sectors',
        new Date('2026-06-13'),
        new Date('2026-06-15'),
      )

      expect(result.get('XLK')).toEqual([
        { date: '2026-06-13', value: 100 },
        { date: '2026-06-15', value: 110 },
      ])
      expect(result.get('XLF')).toEqual([
        { date: '2026-06-13', value: 100 },
        { date: '2026-06-15', value: null },
      ])
      expect(mockSnapshotFindMany).toHaveBeenCalledWith({
        where: {
          rankScope: 'sectors',
          date: { in: [new Date('2026-06-13'), new Date('2026-06-15')] },
        },
        select: {
          symbol: true,
          date: true,
          adjustedClose: true,
          lastPrice: true,
        },
      })
      // Per ADR-0004, qualification is computed against the canonical
      // universe only — groupBy must filter by `symbol: { in: universe }`
      // so stale or non-canonical rows do not inflate coverage.
      const groupByArgs = mockSnapshotGroupBy.mock.calls[0][0] as {
        where: { rankScope: string; symbol?: { in: string[] } }
      }
      expect(groupByArgs.where.rankScope).toBe('sectors')
      expect(groupByArgs.where.symbol?.in).toBeInstanceOf(Array)
      expect(groupByArgs.where.symbol?.in).toContain('XLK')
      expect(groupByArgs.where.symbol?.in).toContain('XLF')
    })

    it('returns null trend values when base is zero or price is null', async () => {
      mockSnapshotGroupBy.mockResolvedValue([
        { date: new Date('2026-06-15'), _count: { symbol: 11 } },
        { date: new Date('2026-06-13'), _count: { symbol: 11 } },
      ])
      mockSnapshotFindMany.mockResolvedValue([
        { symbol: 'XLK', date: new Date('2026-06-13'), adjustedClose: dec(0), lastPrice: dec(0) },
        { symbol: 'XLK', date: new Date('2026-06-15'), adjustedClose: dec(110), lastPrice: dec(111) },
        { symbol: 'XLF', date: new Date('2026-06-13'), adjustedClose: dec(50), lastPrice: dec(50) },
        { symbol: 'XLF', date: new Date('2026-06-15'), adjustedClose: null, lastPrice: null },
      ])

      const result = await getMonitorTrendSeries(
        prisma as any,
        'sectors',
        new Date('2026-06-13'),
        new Date('2026-06-15'),
      )

      expect(result.get('XLK')).toEqual([
        { date: '2026-06-13', value: null },
        { date: '2026-06-15', value: null },
      ])
      expect(result.get('XLF')).toEqual([
        { date: '2026-06-13', value: 100 },
        { date: '2026-06-15', value: null },
      ])
    })

    it('excludes non-canonical symbols from qualified-date coverage (ADR-0004)', async () => {
      // Simulate a DB where 2026-06-14 has only 9 of 11 canonical symbols
      // but also 5 stale 'OLD' rows. Pre-fix this would have counted as
      // 14 snapshots, falsely crossing the 90% threshold (ceil(11*0.9)=10)
      // and qualifying the date. With the symbol filter, only canonical
      // rows count, so 2026-06-14 stays unqualified.
      mockSnapshotGroupBy.mockImplementation(async (args: { where?: { symbol?: { in?: string[] } } }) => {
        const filterSymbols = args.where?.symbol?.in
        // Return different counts depending on whether the filter is applied
        const wide = !filterSymbols
        return [
          { date: new Date('2026-06-15'), _count: { symbol: wide ? 16 : 11 } },
          { date: new Date('2026-06-14'), _count: { symbol: wide ? 14 : 9 } },
          { date: new Date('2026-06-13'), _count: { symbol: wide ? 16 : 11 } },
        ]
      })
      mockSnapshotFindMany.mockResolvedValue([
        { symbol: 'XLK', date: new Date('2026-06-13'), adjustedClose: dec(100), lastPrice: dec(100) },
        { symbol: 'XLK', date: new Date('2026-06-15'), adjustedClose: dec(110), lastPrice: dec(110) },
      ])

      const result = await getMonitorTrendSeries(
        prisma as any,
        'sectors',
        new Date('2026-06-13'),
        new Date('2026-06-15'),
      )

      // 2026-06-14 should NOT appear in qualified dates — its 9 canonical
      // snapshots are below the 90% threshold even though the DB has 14
      // total rows for that date.
      const xlkSeries = result.get('XLK') ?? []
      const seriesDates = xlkSeries.map(p => p.date)
      expect(seriesDates).toEqual(['2026-06-13', '2026-06-15'])
      expect(seriesDates).not.toContain('2026-06-14')
    })

    it('uses the supplied canonical window without resolving a second date sequence', async () => {
      const comparisonDate = new Date('2026-06-13')
      const asOfDate = new Date('2026-06-15')
      mockSnapshotFindMany.mockResolvedValue([
        { symbol: 'XLK', date: comparisonDate, adjustedClose: dec(100), lastPrice: dec(100) },
        { symbol: 'XLK', date: asOfDate, adjustedClose: dec(110), lastPrice: dec(110) },
      ])

      const result = await getMonitorTrendSeries(prisma as any, 'sectors', {
        qualifiedDatesDesc: [asOfDate, comparisonDate],
        latestDate: asOfDate,
        comparisonDate,
      })

      expect(mockSnapshotGroupBy).not.toHaveBeenCalled()
      expect(result.get('XLK')).toEqual([
        { date: '2026-06-13', value: 100 },
        { date: '2026-06-15', value: 110 },
      ])
    })
  })
})
