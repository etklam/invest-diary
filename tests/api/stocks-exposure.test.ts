import { beforeEach, describe, expect, it, vi } from 'vitest'

// ── Prisma mocks ──────────────────────────────────────────────────────

const mockTransactionFindMany = vi.fn()
const mockSnapshotFindFirst = vi.fn()
const mockSnapshotFindMany = vi.fn()
const mockSnapshotGroupBy = vi.fn()
const mockBreadthFindFirst = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    transaction: {
      findMany: (...args: any[]) => mockTransactionFindMany(...args),
    },
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

// ── Auth mock ─────────────────────────────────────────────────────────

const mockRequireUser = vi.fn()

vi.mock('~/server/utils/auth', () => ({
  requireUser: (...args: any[]) => mockRequireUser(...args),
}))

// ── Logger mock ───────────────────────────────────────────────────────

vi.mock('~/lib/logger', () => ({
  logger: {
    stocks: { withRequestId: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })) },
    api: { withRequestId: vi.fn(() => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() })) },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────

function decimal(value: number) {
  return { toNumber: () => value, valueOf: () => value }
}

const SNAPSHOT_DATE = new Date('2026-06-12T00:00:00.000Z')

function makeTransaction(symbol: string, type: 'BUY' | 'SELL', quantity: number, price: number) {
  return {
    id: BigInt(1),
    symbol,
    type,
    quantity: decimal(quantity),
    price: decimal(price),
    tradeDate: new Date('2026-01-15'),
  }
}

function makeEvent() {
  return { context: { requestId: 'test-req-id' } }
}

// ── Tests ─────────────────────────────────────────────────────────────

describe('GET /api/stocks/exposure', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    mockRequireUser.mockReturnValue({ id: 1 })
  })

  // ── Case 1: 完整 payload shape ────────────────────────────────────

  it('有 rotation data 時回傳完整 payload', async () => {
    // Holdings: NVDA (mega_cap) + QQQ (core_index) + BIL (cash_proxy)
    mockTransactionFindMany.mockResolvedValue([
      makeTransaction('NVDA', 'BUY', 10, 100),
      makeTransaction('QQQ', 'BUY', 5, 400),
      makeTransaction('BIL', 'BUY', 100, 91),
    ])

    // Rotation snapshot: sectors
    const sectorRows = [
      'XLK', 'XLF', 'XLE', 'XLU', 'XLP', 'XLY', 'XLI', 'XLV', 'XLB', 'XLC', 'XLRE',
    ].map((symbol, i) => ({
        id: BigInt(i + 1),
        date: SNAPSHOT_DATE,
        symbol,
        rankScope: 'sectors',
        groupType: 'sector',
        sectorName: symbol,
        lastPrice: decimal(100),
        adjustedClose: decimal(100),
        rsi14: decimal(55),
        above20d: true,
        above50d: true,
        maStatus: 'bullish_stack',
        percentFromHigh: decimal(-2),
        rotationScore: decimal(50),
        rotationScoreDelta2W: decimal(5),
        rotationRank: i + 1,
        rankDelta2W: null,
        rsiDelta2W: decimal(0),
        twoWeekPerformancePct: decimal(2),
        signal: 'turning_strong',
        signalStatus: 'complete',
    }))
    mockSnapshotFindFirst.mockResolvedValue({ date: SNAPSHOT_DATE })
    mockSnapshotFindMany.mockResolvedValue(sectorRows)
    mockSnapshotGroupBy.mockResolvedValue([
      { date: SNAPSHOT_DATE, _count: { symbol: sectorRows.length } },
    ])
    mockBreadthFindFirst.mockResolvedValue({ regime: 'RISK_ON' })

    const { default: handler } = await import('~/server/api/stocks/exposure.get')
    const result = await handler(makeEvent())

    // Top-level shape
    expect(result.exposure).toBeDefined()
    expect(result.gaps).toBeDefined()
    expect(result.suggestedAllocation).toBeDefined()
    expect(result.betaAllocation).toBeDefined()
    expect(result.marketState).toBe('risk_on')
    expect(result.lastUpdated).toBeTypeOf('string')

    // exposure has PortfolioExposure keys
    expect(result.exposure.highBetaPct).toBeTypeOf('number')
    expect(result.exposure.coreIndexPct).toBeTypeOf('number')
    expect(result.exposure.cashProxyPct).toBeTypeOf('number')

    // gaps is an array of ExposureGap
    expect(Array.isArray(result.gaps)).toBe(true)
    expect(result.gaps).toHaveLength(3)
    const highBetaGap = result.gaps.find((g: any) => g.bucket === 'highBeta')
    expect(highBetaGap).toBeDefined()
    expect(['underweight', 'balanced', 'overweight']).toContain(highBetaGap.status)

    // suggestedAllocation has 3 targets
    expect(result.suggestedAllocation.highBetaTargetPct).toBeTypeOf('number')
    expect(result.suggestedAllocation.coreIndexTargetPct).toBeTypeOf('number')
    expect(result.suggestedAllocation.cashTargetPct).toBeTypeOf('number')

    // betaAllocation has explanation + warnings
    expect(result.betaAllocation.explanation).toBeTypeOf('string')
    expect(Array.isArray(result.betaAllocation.warnings)).toBe(true)
  })

  // ── Case 2: 無 rotation snapshot → fallback 不 throw ──────────────

  it('無 rotation snapshot 時回 marketState=unknown + 空 gaps + fallback 解釋', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTransaction('NVDA', 'BUY', 10, 100),
    ])
    mockSnapshotFindFirst.mockResolvedValue(null)
    mockSnapshotGroupBy.mockResolvedValue([])
    mockBreadthFindFirst.mockResolvedValue(null)

    const { default: handler } = await import('~/server/api/stocks/exposure.get')
    const result = await handler(makeEvent())

    // 不 throw，回 exposure
    expect(result.exposure).toBeDefined()
    expect(result.exposure.highBetaPct).toBeTypeOf('number')

    // marketState=unknown
    expect(result.marketState).toBe('unknown')

    // gaps 為空陣列
    expect(result.gaps).toEqual([])

    // suggestedAllocation 存在但可能 fallback
    expect(result.suggestedAllocation).toBeDefined()

    // betaAllocation.explanation 含 fallback 字樣
    expect(result.betaAllocation.explanation.toLowerCase()).toMatch(/market regime|no.*data|unclear|default/)

    // lastUpdated 為 null
    expect(result.lastUpdated).toBeNull()
  })

  // ── Case 3: 無 holdings → exposure 為零、不 throw ─────────────────

  it('無 holdings 時 exposure 全零也不 throw', async () => {
    mockTransactionFindMany.mockResolvedValue([])
    mockSnapshotFindFirst.mockResolvedValue({ date: SNAPSHOT_DATE })
    // Full sectors universe (11) so qualified-date filter passes
    const sectorSymbols = [
      'XLK', 'XLF', 'XLE', 'XLU', 'XLP', 'XLY', 'XLI', 'XLV', 'XLB', 'XLC', 'XLRE',
    ]
    const sectorRows = sectorSymbols.map((symbol, i) => ({
      id: BigInt(i + 1),
      date: SNAPSHOT_DATE,
      symbol,
      rankScope: 'sectors',
      groupType: 'sector',
      sectorName: symbol,
      lastPrice: decimal(100),
      adjustedClose: decimal(100),
      rsi14: decimal(55),
      above20d: true,
      above50d: true,
      maStatus: 'bullish_stack',
      percentFromHigh: decimal(-2),
      rotationScore: decimal(50),
      rotationScoreDelta2W: decimal(5),
      rotationRank: i + 1,
      rankDelta2W: null,
      rsiDelta2W: decimal(0),
      twoWeekPerformancePct: decimal(2),
      signal: 'turning_strong',
      signalStatus: 'complete',
    }))
    mockSnapshotFindMany.mockResolvedValue(sectorRows)
    mockSnapshotGroupBy.mockResolvedValue([
      { date: SNAPSHOT_DATE, _count: { symbol: sectorRows.length } },
    ])
    mockBreadthFindFirst.mockResolvedValue({ regime: 'RISK_ON' })

    const { default: handler } = await import('~/server/api/stocks/exposure.get')
    const result = await handler(makeEvent())

    expect(result.exposure.highBetaPct).toBe(0)
    expect(result.exposure.coreIndexPct).toBe(0)
    expect(result.exposure.totalValue).toBe(0)
    // gaps 仍回 3 條（全部 underweight vs target）
    expect(result.gaps).toHaveLength(3)
  })

  // ── Case 4: overweight high beta 時 gaps 標 overweight ────────────

  it('holdings 全是 NVDA + rotation=neutral 時 highBeta gap=overweight', async () => {
    mockTransactionFindMany.mockResolvedValue([
      makeTransaction('NVDA', 'BUY', 100, 500),  // 全 mega_cap → highBeta bucket
    ])

    const sectorRows = ['XLK', 'XLF', 'XLE', 'XLU', 'XLP', 'XLY', 'XLI', 'XLV', 'XLB', 'XLC', 'XLRE'].map((symbol, i) => ({
      id: BigInt(i + 1),
      date: SNAPSHOT_DATE,
      symbol,
      rankScope: 'sectors',
      groupType: 'sector',
      sectorName: symbol,
      lastPrice: decimal(100),
      adjustedClose: decimal(100),
      rsi14: decimal(55),
      above20d: true,
      above50d: true,
      maStatus: 'bullish_stack',
      percentFromHigh: decimal(-2),
      rotationScore: decimal(50),
      rotationScoreDelta2W: decimal(5),
      rotationRank: i + 1,
      rankDelta2W: null,
      rsiDelta2W: decimal(0),
      twoWeekPerformancePct: decimal(2),
      signal: 'turning_strong',
      signalStatus: 'complete',
    }))
    mockSnapshotFindFirst.mockResolvedValue({ date: SNAPSHOT_DATE })
    mockSnapshotFindMany.mockResolvedValue(sectorRows)
    mockSnapshotGroupBy.mockResolvedValue([
      { date: SNAPSHOT_DATE, _count: { symbol: sectorRows.length } },
    ])
    mockBreadthFindFirst.mockResolvedValue({ regime: 'NEUTRAL' })

    const { default: handler } = await import('~/server/api/stocks/exposure.get')
    const result = await handler(makeEvent())

    const highBetaGap = result.gaps.find((g: any) => g.bucket === 'highBeta')
    expect(highBetaGap.status).toBe('overweight')
    expect(highBetaGap.currentPct).toBe(100)
  })
})
