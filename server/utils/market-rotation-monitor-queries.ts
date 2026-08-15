/**
 * server/utils/market-rotation-monitor-queries.ts
 *
 * Query layer for the market rotation monitor API endpoint.
 * Reads latest snapshots and assembles MarketRotationMonitorRow[],
 * resolves market state from market_breadth_daily.
 *
 * All functions accept a prisma instance as the first argument (DI pattern)
 * for testability, consistent with market-rotation-queries.ts.
 */

import {
  buildMarketRotationMonitorPayload,
  type MarketRotationMonitorPayload,
  type MarketRotationMonitorRow,
  type MarketRotationTrendPoint,
} from '~/lib/market-rotation/monitor'
import type { MarketState } from '~/lib/market-rotation/state'
import type { MaStatus, RotationSignal, SignalStatus } from '~/lib/market-rotation/signal'
import { toNumber, type DecimalLike } from '~/lib/market-rotation/decimal'
import { getUniverseForScope } from '~/lib/market-rotation/universe'
import type { RankScope } from '~/lib/market-rotation/types'
import { buildNormalizedTrendSeries } from '~/lib/market-rotation/trend-series'
import { loadQualifiedDatesForScope, type QualifiedDateWindow } from '~/lib/market-rotation/qualified-date'
import { decideBetaAllocation, type BetaAllocationResult } from '~/lib/beta-allocation/policy'
import { generateMarketSummary } from '~/lib/market-rotation/summary'
import { MARKET_BREADTH_MIN_COVERAGE_PCT } from '~/lib/market-state/breadth'
import { getLatestBreadthSnapshot, type SnapshotResult } from '~/server/utils/market-state-queries'
import {
  getComparisonWindow,
  type MarketRotationComparisonWindow,
} from '~/server/utils/market-rotation-queries'

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

// ─── Prisma interface (structural typing for DI) ───────────────────────────

interface MonitorPrisma {
  marketRotationSnapshot: {
    findFirst: (args: {
      where: { rankScope: string }
      orderBy: { date: 'desc' }
      select: { date: true }
    }) => Promise<{ date: Date } | null>
    findMany: (args: {
      where: { rankScope: string; date: Date; symbol?: { in: string[] } }
    }) => Promise<Array<Record<string, unknown>>>
    groupBy: (args: {
      by: ['date']
      where: { rankScope: string; symbol?: { in: string[] } }
      _count: { symbol: true }
      orderBy: { date: 'desc' }
    }) => Promise<Array<{ date: Date; _count: { symbol: number } }>>
  }
  marketBreadthDaily: {
    findFirst: (args: {
      where: { universeKey: string }
      orderBy: { date: 'desc' }
      select?: { regime: true }
    }) => Promise<Record<string, unknown> | null>
  }
}

// ─── Universe name resolver ────────────────────────────────────────────────

/**
 * Build a symbol → name map from the universe for the given scope.
 */
function buildNameMap(rankScope: RankScope): Map<string, string> {
  const universe = getUniverseForScope(rankScope)
  const map = new Map<string, string>()
  for (const entry of universe) {
    map.set(entry.symbol, entry.name)
  }
  return map
}

// ─── Row transformer ──────────────────────────────────────────────────────

/**
 * Convert a raw Prisma snapshot row into a MarketRotationMonitorRow.
 */
function toMonitorRow(
  raw: Record<string, unknown>,
  nameMap: Map<string, string>,
): MarketRotationMonitorRow {
  const symbol = raw.symbol as string
  const name = nameMap.get(symbol) ?? symbol

  return {
    symbol,
    name,
    groupType: raw.groupType as 'sector' | 'index' | 'core',
    sectorName: (raw.sectorName as string | null) ?? null,
    lastPrice: toNumber(raw.lastPrice as DecimalLike),
    rsi14: toNumber(raw.rsi14 as DecimalLike),
    above20d: (raw.above20d as boolean | null) ?? null,
    above50d: (raw.above50d as boolean | null) ?? null,
    maStatus: (raw.maStatus as MaStatus) ?? 'unknown',
    percentFromHigh: toNumber(raw.percentFromHigh as DecimalLike),
    rotationScore: toNumber(raw.rotationScore as DecimalLike),
    rotationScoreDelta2W: toNumber(raw.rotationScoreDelta2W as DecimalLike),
    rotationRank: (raw.rotationRank as number | null) ?? null,
    rankDelta2W: (raw.rankDelta2W as number | null) ?? null,
    rsiDelta2W: toNumber(raw.rsiDelta2W as DecimalLike),
    twoWeekPerformancePct: toNumber(raw.twoWeekPerformancePct as DecimalLike),
    twoWeekTrend: [],
    signal: (raw.signal as RotationSignal | null) ?? null,
    signalStatus: (raw.signalStatus as SignalStatus) ?? 'insufficient_data',
  }
}

// ─── Query functions ───────────────────────────────────────────────────────

const DEFAULT_UNIVERSE_KEY = 'SP500_NDX'
export const MIN_BREADTH_COVERAGE_PCT = MARKET_BREADTH_MIN_COVERAGE_PCT

export interface RotationDashboardContext {
  payload: MarketRotationMonitorPayload | null
  marketState: MarketState
  betaAllocation: BetaAllocationResult | null
  lastUpdated: Date | null
}

function resolveFreshMarketState(snapshot: SnapshotResult | null): MarketState {
  if (!snapshot || snapshot.isStale || snapshot.coveragePct == null || snapshot.coveragePct < MIN_BREADTH_COVERAGE_PCT) {
    return 'unknown'
  }

  return snapshot.regime
}

/**
 * getLatestMonitorRows
 *
 * Reads the latest snapshots for the given rankScope and converts them
 * into MarketRotationMonitorRow[] with universe name mapping applied.
 *
 * @param prisma - Prisma client instance (DI)
 * @param rankScope - The ranking scope ('sectors', 'indexes', 'core')
 * @returns Object with rows array and asOfDate (null if no data)
 */
export async function getLatestMonitorRows(
  prisma: MonitorPrisma,
  rankScope: RankScope,
): Promise<{
  rows: MarketRotationMonitorRow[]
  asOfDate: Date | null
  comparisonWindow: MarketRotationComparisonWindow
}> {
  const comparisonWindow = await getComparisonWindow(
    prisma as any,
    rankScope as 'sectors' | 'indexes' | 'core',
  )
  const latestDate = comparisonWindow.latestDate

  if (!latestDate) {
    return { rows: [], asOfDate: null, comparisonWindow }
  }

  // Step 2: Read canonical snapshots only; stale symbols must not leak into
  // ranking, breadth, or coverage after the qualified date is selected.
  const canonicalSymbols = getUniverseForScope(rankScope).map(entry => entry.symbol)
  const rawRows = await prisma.marketRotationSnapshot.findMany({
    where: {
      rankScope,
      date: latestDate,
      symbol: { in: canonicalSymbols },
    },
  })

  // Step 3: Transform to monitor rows with name mapping
  const nameMap = buildNameMap(rankScope)
  const rows = rawRows.map(raw => toMonitorRow(raw, nameMap))

  return { rows, asOfDate: latestDate, comparisonWindow }
}

/**
 * resolveMarketState
 *
 * V1 simplified: reads the latest regime from market_breadth_daily
 * and converts via toMarketState().
 *
 * @param prisma - Prisma client instance (DI)
 * @returns MarketState derived from breadth regime, or 'unknown'
 */
export async function resolveMarketState(
  prisma: MonitorPrisma,
): Promise<MarketState> {
  const snapshot = await getLatestBreadthSnapshot(
    prisma as unknown as Parameters<typeof getLatestBreadthSnapshot>[0],
    DEFAULT_UNIVERSE_KEY,
  )

  return resolveFreshMarketState(snapshot)
}

/**
 * Assemble the shared rotation dashboard context consumed by both the
 * rotation-monitor and exposure endpoints.
 *
 * This owns the dashboard invariants: sector breadth always comes from the
 * sectors scope, breadth freshness is checked before resolving Market State,
 * and beta allocation is derived exactly once from the assembled payload.
 */
export async function getRotationDashboardContext(
  prisma: MonitorPrisma,
  { scope }: { scope: RankScope },
): Promise<RotationDashboardContext> {
  const { rows, asOfDate, comparisonWindow } = await getLatestMonitorRows(prisma, scope)
  const summaryRows = scope === 'sectors'
    ? rows
    : (await getLatestMonitorRows(prisma, 'sectors')).rows

  if (rows.length === 0 || !asOfDate) {
    return {
      payload: null,
      marketState: 'unknown',
      betaAllocation: null,
      lastUpdated: null,
    }
  }

  const breadthSnapshot = await getLatestBreadthSnapshot(
    prisma as unknown as Parameters<typeof getLatestBreadthSnapshot>[0],
    DEFAULT_UNIVERSE_KEY,
  )
  const marketState = resolveFreshMarketState(breadthSnapshot)
  const comparisonDate = comparisonWindow.comparisonDate
    ? toDateString(comparisonWindow.comparisonDate)
    : null
  const trendSeries = comparisonDate
    ? await getMonitorTrendSeries(prisma, scope, comparisonWindow)
    : new Map<string, MarketRotationTrendPoint[]>()
  const rowsWithTrend = rows.map(row => ({
    ...row,
    twoWeekTrend: trendSeries.get(row.symbol) ?? [],
  }))

  const basePayload = buildMarketRotationMonitorPayload({
    asOfDate: toDateString(asOfDate),
    comparisonDate,
    rankScope: scope,
    marketState,
    rows: rowsWithTrend,
    summaryRows,
  })
  const betaAllocation = decideBetaAllocation({
    marketState: basePayload.summary.marketState,
    breadthConfirmation: basePayload.summary.breadthConfirmation,
    above50dRatio: basePayload.summary.above50d.ratio,
    averageRsi: basePayload.summary.averageRsi,
    leadership: {
      topImproving: basePayload.topImproving.map(row => row.sectorName ?? row.symbol),
      bottomWeakening: basePayload.bottomWeakening.map(row => row.sectorName ?? row.symbol),
    },
  })
  const currentMarketSummary = generateMarketSummary({
    marketState: basePayload.summary.marketState,
    breadthCondition: basePayload.summary.breadthCondition,
    breadthConfirmation: basePayload.summary.breadthConfirmation,
    topImproving: basePayload.topImproving.map(row => ({
      symbol: row.symbol,
      sectorName: row.sectorName,
    })),
    bottomWeakening: basePayload.bottomWeakening.map(row => ({
      symbol: row.symbol,
      sectorName: row.sectorName,
    })),
    above50dRatio: basePayload.summary.above50d.ratio,
    averageRsi: basePayload.summary.averageRsi,
    beta: betaAllocation,
  })

  return {
    payload: { ...basePayload, currentMarketSummary },
    marketState,
    betaAllocation,
    lastUpdated: asOfDate,
  }
}

/**
 * getMonitorTrendSeries
 *
 * Builds comparison-date-normalized 2W sparkline series from persisted
 * snapshots. It uses one qualified date sequence for the whole rank scope.
 *
 * Per ADR-0004, qualification is computed against the canonical universe
 * only — the groupBy filters by `symbol: { in: universe }` so stale or
 * non-canonical symbols in the snapshot table do not inflate coverage.
 * The 90% threshold itself lives in `lib/market-rotation/qualified-date.ts`.
 */
export async function getMonitorTrendSeries(
  prisma: MonitorPrisma,
  rankScope: 'sectors' | 'indexes' | 'core',
  comparisonDateOrWindow: Date | QualifiedDateWindow,
  asOfDate?: Date,
): Promise<Map<string, MarketRotationTrendPoint[]>> {
  const universe = getUniverseForScope(rankScope)
  const universeSymbols = universe.map(entry => entry.symbol)

  let comparisonDate: Date | null
  let trendEndDate: Date | null
  let qualifiedDatesDesc: Date[]

  if (comparisonDateOrWindow instanceof Date) {
    comparisonDate = comparisonDateOrWindow
    trendEndDate = asOfDate ?? null
    qualifiedDatesDesc = await loadQualifiedDatesForScope(
      prisma,
      rankScope,
      universe.length,
      universeSymbols,
    )
  }
  else {
    comparisonDate = comparisonDateOrWindow.comparisonDate
    trendEndDate = comparisonDateOrWindow.latestDate ?? asOfDate ?? null
    qualifiedDatesDesc = comparisonDateOrWindow.qualifiedDatesDesc
  }

  if (!comparisonDate || !trendEndDate) {
    return new Map()
  }

  const qualifiedDates = qualifiedDatesDesc
    .filter(date => date >= comparisonDate && date <= trendEndDate)
    .sort((a, b) => a.getTime() - b.getTime())

  if (qualifiedDates.length === 0) {
    return new Map()
  }

  const rawRows = await prisma.marketRotationSnapshot.findMany({
    where: {
      rankScope,
      date: { in: qualifiedDates },
    },
    select: {
      symbol: true,
      date: true,
      adjustedClose: true,
      lastPrice: true,
    },
  } as any)
  const priceBySymbolDate = new Map<string, number | null>()

  for (const raw of rawRows as Array<Record<string, unknown>>) {
    const symbol = raw.symbol as string
    const date = raw.date as Date
    const adjustedClose = toNumber(raw.adjustedClose as DecimalLike)
    const lastPrice = toNumber(raw.lastPrice as DecimalLike)
    priceBySymbolDate.set(`${symbol}:${toDateString(date)}`, adjustedClose ?? lastPrice)
  }

  const result = new Map<string, MarketRotationTrendPoint[]>()
  for (const entry of universe) {
    const series = buildNormalizedTrendSeries({
      symbol: entry.symbol,
      qualifiedDates: qualifiedDates.map(d => toDateString(d)),
      priceBySymbolDate,
      comparisonDate: toDateString(comparisonDate),
    })
    result.set(entry.symbol, series)
  }

  return result
}
