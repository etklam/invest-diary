import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery } from '../vi-setup'

// ── Prisma mocks ──────────────────────────────────────────────────────

const mockSnapshotFindFirst = vi.fn()
const mockSnapshotFindMany = vi.fn()
const mockSnapshotGroupBy = vi.fn()
const mockBreadthFindFirst = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    marketRotationSnapshot: {
      findFirst: (...args: any[]) => mockSnapshotFindFirst(...args),
      findMany: (...args: any[]) => mockSnapshotFindMany(...args),
      groupBy: (...args: any[]) => mockSnapshotGroupBy(...args),
    },
    marketBreadthDaily: {
      findFirst: (...args: any[]) => mockBreadthFindFirst(...args),
    },
  },
}))

// ── Logger mock ───────────────────────────────────────────────────────

vi.mock('~/lib/logger', () => ({
  logger: {
    api: { withRequestId: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn() })) },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────

function decimal(value: number) {
  return { toNumber: () => value, valueOf: () => value }
}

const SNAPSHOT_DATE = new Date('2026-06-12T00:00:00.000Z')
const COMPARISON_DATE = new Date('2026-05-29T00:00:00.000Z')

function makeSnapshotRow(overrides: Record<string, unknown> = {}) {
  return {
    id: BigInt(1),
    date: SNAPSHOT_DATE,
    symbol: 'XLK',
    rankScope: 'sectors',
    groupType: 'sector',
    sectorName: 'Technology',
    lastPrice: decimal(180.5),
    adjustedClose: decimal(180.5),
    dailyChangePct: decimal(1.2),
    weeklyChangePct: decimal(3.5),
    twoWeekPerformancePct: decimal(5.2),
    rsi14: decimal(65.3),
    rsiPercentile: decimal(75.0),
    rsiDelta2W: decimal(8.5),
    ema10: decimal(175),
    ema20: decimal(170),
    sma50: decimal(165),
    sma200: decimal(150),
    above10d: true,
    above20d: true,
    above50d: true,
    above200d: true,
    maScore: 100,
    maScorePercentile: decimal(90),
    maStatus: 'bullish_stack',
    rolling252dHigh: decimal(185),
    percentFromHigh: decimal(-2.4),
    distanceFromHighScore: decimal(88),
    distanceFromHighScorePercentile: decimal(80),
    rotationScore: decimal(78.5),
    rotationScoreDelta2W: decimal(13.5),
    rotationRank: 1,
    rankDelta2W: 2,
    signal: 'turning_strong',
    signalStatus: 'complete',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  }
}

const SECTOR_SYMBOLS = [
  { symbol: 'XLK', name: 'Technology', sectorName: 'Technology' },
  { symbol: 'XLF', name: 'Financials', sectorName: 'Financials' },
  { symbol: 'XLE', name: 'Energy', sectorName: 'Energy' },
  { symbol: 'XLU', name: 'Utilities', sectorName: 'Utilities' },
  { symbol: 'XLP', name: 'Consumer Staples', sectorName: 'Consumer Staples' },
  { symbol: 'XLY', name: 'Consumer Discretionary', sectorName: 'Consumer Discretionary' },
  { symbol: 'XLI', name: 'Industrials', sectorName: 'Industrials' },
  { symbol: 'XLV', name: 'Health Care', sectorName: 'Health Care' },
  { symbol: 'XLB', name: 'Materials', sectorName: 'Materials' },
  { symbol: 'XLC', name: 'Communication Services', sectorName: 'Communication Services' },
  { symbol: 'XLRE', name: 'Real Estate', sectorName: 'Real Estate' },
]

const INDEX_SYMBOLS = [
  { symbol: 'SPY', name: 'S&P 500', sectorName: null },
  { symbol: 'QQQ', name: 'Nasdaq 100', sectorName: null },
  { symbol: 'DIA', name: 'Dow Jones', sectorName: null },
  { symbol: 'IWM', name: 'Russell 2000', sectorName: null },
  { symbol: 'RSP', name: 'S&P 500 Equal Weight', sectorName: null },
  { symbol: 'VTI', name: 'US Total Market', sectorName: null },
  { symbol: 'VEA', name: 'Developed ex-US', sectorName: null },
  { symbol: 'VWO', name: 'Emerging Markets', sectorName: null },
]

function makeSectorRows(): ReturnType<typeof makeSnapshotRow>[] {
  return SECTOR_SYMBOLS.map((s, i) =>
    makeSnapshotRow({
      id: BigInt(i + 1),
      symbol: s.symbol,
      sectorName: s.sectorName,
      rotationRank: i + 1,
      rankDelta2W: i < 3 ? i + 1 : -(i - 2),
    }),
  )
}

function makeIndexRows(): ReturnType<typeof makeSnapshotRow>[] {
  return INDEX_SYMBOLS.map((s, i) =>
    makeSnapshotRow({
      id: BigInt(i + 1),
      symbol: s.symbol,
      rankScope: 'indexes',
      groupType: 'index',
      sectorName: s.sectorName,
      rotationRank: i + 1,
      rankDelta2W: i < 2 ? i + 1 : -(i - 1),
    }),
  )
}

function makeEvent(query: Record<string, string> = {}) {
  mockGetQuery.mockReturnValue(query)
  return {
    context: { requestId: 'test-req-id' },
  }
}

/**
 * Configure prisma mocks for a full successful flow.
 * Uses mockImplementation to route by call order:
 *   findFirst call 1 → getLatestMonitorRows (returns latest date)
 *   findFirst call 2 → getMonitorComparisonDate (returns latest date)
 *   findMany  call 1 → getLatestMonitorRows (returns rows)
 *   findMany  call 2 → getMonitorComparisonDate (returns rows, checks rankDelta2W)
 *   groupBy       → getComparisonDate (returns date list for offset)
 */
function setupFullFlowMocks(rows: ReturnType<typeof makeSnapshotRow>[], breadthRegime = 'RISK_ON', groupByDates: Date[] = [SNAPSHOT_DATE, COMPARISON_DATE]) {
  mockSnapshotFindFirst.mockResolvedValue({ date: SNAPSHOT_DATE })

  mockSnapshotFindMany.mockResolvedValue(rows)

  mockSnapshotGroupBy.mockResolvedValue(
    groupByDates.map(date => ({
      date,
      _count: { symbol: rows.length },
    })),
  )

  mockBreadthFindFirst.mockResolvedValue({ regime: breadthRegime })
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('GET /api/market/rotation-monitor', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ── Case 1: Full sectors scope payload ────────────────────────────

  it('正常 sectors scope 回傳完整 payload', async () => {
    const rows = makeSectorRows()
    setupFullFlowMocks(rows, 'RISK_ON')

    const { default: handler } = await import('~/server/api/market/rotation-monitor.get')
    const result = await handler(makeEvent({ scope: 'sectors' }))

    // summary
    expect(result.summary.marketState).toBe('risk_on')
    expect(result.summary.breadthCondition).toBeDefined()
    expect(result.summary.above50d).toBeDefined()
    expect(result.summary.averageRsi).toBeDefined()

    // rows
    expect(result.rows).toHaveLength(11)

    // currentMarketSummary
    expect(result.currentMarketSummary).toBeTypeOf('string')
    expect(result.currentMarketSummary).toContain('Risk-on')

    // dataQuality
    expect(result.dataQuality.rowCount).toBe(11)
    expect(result.dataQuality.rankScope).toBe('sectors')
    expect(result.dataQuality.asOfDate).toBe('2026-06-12')
  })

  // ── Case 2: No snapshot data → 404 ────────────────────────────────

  it('無 snapshot 資料時拋 404', async () => {
    mockSnapshotGroupBy.mockResolvedValue([])
    mockBreadthFindFirst.mockResolvedValue({ regime: 'RISK_ON' })

    const { default: handler } = await import('~/server/api/market/rotation-monitor.get')

    await expect(handler(makeEvent({ scope: 'sectors' }))).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  // ── Case 3: No comparison data → comparisonDate null ──────────────

  it('無 comparison data 時 comparisonDate 為 null', async () => {
    // Rows with all rankDelta2W = null → no comparison data
    const rows = makeSectorRows().map(r => ({ ...r, rankDelta2W: null }))
    setupFullFlowMocks(rows, 'RISK_ON', [])

    mockSnapshotGroupBy
      .mockResolvedValueOnce([{ date: SNAPSHOT_DATE, _count: { symbol: rows.length } }])
      .mockResolvedValueOnce([{ date: SNAPSHOT_DATE, _count: { symbol: rows.length } }])
      .mockResolvedValue([])

    const { default: handler } = await import('~/server/api/market/rotation-monitor.get')
    const result = await handler(makeEvent({ scope: 'sectors' }))

    expect(result.dataQuality.comparisonDate).toBeNull()
  })

  // ── Case 4: Invalid scope → 400 validation error ──────────────────

  it('invalid scope 拋 validation error (400)', async () => {
    const { default: handler } = await import('~/server/api/market/rotation-monitor.get')

    await expect(handler(makeEvent({ scope: 'invalid' }))).rejects.toMatchObject({
      statusCode: 400,
    })
  })

  it('core scope 回 200 + 真實 core universe 資料', async () => {
    // Use real core universe symbols (from lib/market-rotation/universe.ts):
    // core_etf (13) + mega_cap (10) = 23 entries
    const CORE_ETF_SYMBOLS = [
      'SPY', 'VOO', 'QQQ', 'QQQM', 'SOXX', 'SMH', 'XLK', 'IGV',
      'XLP', 'XLU', 'TLT', 'BIL', 'SGOV',
    ]
    const MEGA_CAP_SYMBOLS = [
      'NVDA', 'MSFT', 'AAPL', 'GOOGL', 'AMZN', 'META', 'TSLA',
      'MU', 'PLTR', 'CRWV',
    ]
    const coreRows = [
      ...CORE_ETF_SYMBOLS.map((symbol, i) =>
        makeSnapshotRow({
          id: BigInt(i + 1),
          symbol,
          rankScope: 'core',
          groupType: 'core_etf',
          rotationRank: i + 1,
          rankDelta2W: i < 3 ? i + 1 : -(i - 2),
        }),
      ),
      ...MEGA_CAP_SYMBOLS.map((symbol, i) =>
        makeSnapshotRow({
          id: BigInt(i + 14),
          symbol,
          rankScope: 'core',
          groupType: 'mega_cap',
          rotationRank: i + 14,
          rankDelta2W: i < 3 ? i + 1 : -(i - 2),
        }),
      ),
    ]
    // Reset previous mock implementations (sticky mockResolvedValue from earlier tests)
    mockSnapshotFindFirst.mockReset()
    mockSnapshotFindMany.mockReset()
    mockSnapshotGroupBy.mockReset()
    mockBreadthFindFirst.mockReset()
    setupFullFlowMocks(coreRows, 'RISK_ON')

    const { default: handler } = await import('~/server/api/market/rotation-monitor.get')
    const result = await handler(makeEvent({ scope: 'core' }))

    expect(result.dataQuality.rankScope).toBe('core')
    expect(result.rows).toHaveLength(23)
  })

  // ── Case 4b: betaAllocation 欄位在 response 中 ─────────────────

  it('sectors scope payload 含 betaAllocation 欄位（含配置與 mode）', async () => {
    const rows = makeSectorRows()
    // Reset previous mock implementations
    mockSnapshotFindFirst.mockReset()
    mockSnapshotFindMany.mockReset()
    mockSnapshotGroupBy.mockReset()
    mockBreadthFindFirst.mockReset()
    setupFullFlowMocks(rows, 'RISK_ON')

    const { default: handler } = await import('~/server/api/market/rotation-monitor.get')
    const result = await handler(makeEvent({ scope: 'sectors' }))

    expect(result.betaAllocation).toBeDefined()
    expect(result.betaAllocation.suggestedMode).toBe('aggressive')
    expect(result.betaAllocation.suggestedBetaLevel).toBe(1.3)
    expect(result.betaAllocation.highBetaTargetPct).toBe(60)
    expect(result.betaAllocation.coreIndexTargetPct).toBe(30)
    expect(result.betaAllocation.cashTargetPct).toBe(10)
    expect(result.betaAllocation.explanation).toBeTypeOf('string')
    expect(result.betaAllocation.explanation.length).toBeGreaterThan(10)
    expect(Array.isArray(result.betaAllocation.warnings)).toBe(true)
  })

  it('currentMarketSummary 含 beta suggestion 段落文字', async () => {
    const rows = makeSectorRows()
    // Reset previous mock implementations
    mockSnapshotFindFirst.mockReset()
    mockSnapshotFindMany.mockReset()
    mockSnapshotGroupBy.mockReset()
    mockBreadthFindFirst.mockReset()
    setupFullFlowMocks(rows, 'RISK_ON')

    const { default: handler } = await import('~/server/api/market/rotation-monitor.get')
    const result = await handler(makeEvent({ scope: 'sectors' }))

    // 新增：currentMarketSummary 應含 beta suggestion 關鍵字
    expect(result.currentMarketSummary).toContain('aggressive')
    expect(result.currentMarketSummary.toLowerCase()).toMatch(/beta|posture|exposure/)
  })

  // ── Case 5: Default scope = sectors ───────────────────────────────

  it('default scope = sectors', async () => {
    const rows = makeSectorRows()
    setupFullFlowMocks(rows, 'RISK_ON')

    // No scope query param at all
    const { default: handler } = await import('~/server/api/market/rotation-monitor.get')
    const result = await handler(makeEvent({}))

    expect(result.dataQuality.rankScope).toBe('sectors')
    expect(result.rows).toHaveLength(11)
  })

  // ── Case 6: Indexes scope returns correct data ────────────────────

  it('不同 scope（indexes）回傳正確資料', async () => {
    const rows = makeIndexRows()
    setupFullFlowMocks(rows, 'NEUTRAL')

    const { default: handler } = await import('~/server/api/market/rotation-monitor.get')
    const result = await handler(makeEvent({ scope: 'indexes' }))

    expect(result.rows).toHaveLength(8)
    expect(result.dataQuality.rankScope).toBe('indexes')
    expect(result.summary.marketState).toBe('neutral')
  })
})
