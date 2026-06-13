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

import type { PrismaClient } from '@prisma/client'
import type { MarketRotationMonitorRow, MarketRotationTrendPoint } from '~/lib/market-rotation/monitor'
import type { MarketState } from '~/lib/market-rotation/state'
import { toMarketState } from '~/lib/market-rotation/state'
import type { MaStatus, RotationSignal, SignalStatus } from '~/lib/market-rotation/signal'
import { getUniverseForScope } from '~/lib/market-rotation/universe'
import { getComparisonDate } from '~/server/utils/market-rotation-queries'

// ─── Type helpers ──────────────────────────────────────────────────────────

type DecimalLike =
  | number
  | string
  | { toNumber?: () => number; valueOf?: () => unknown }
  | null
  | undefined

function toNumber(value: DecimalLike): number | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'number') return value
  if (typeof value === 'string') return Number(value)
  if (typeof value.toNumber === 'function') return value.toNumber()
  const primitive = value.valueOf?.()
  return typeof primitive === 'number' ? primitive : Number(primitive)
}

function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function roundTrendValue(value: number): number {
  return Math.round(value * 10000) / 10000
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
      where: { rankScope: string; date: Date }
    }) => Promise<Array<Record<string, unknown>>>
    groupBy: (args: {
      by: ['date']
      where: { rankScope: string }
      _count: { symbol: true }
      orderBy: { date: 'desc' }
    }) => Promise<Array<{ date: Date; _count: { symbol: number } }>>
  }
  marketBreadthDaily: {
    findFirst: (args: {
      where: { universeKey: string }
      orderBy: { date: 'desc' }
      select: { regime: true }
    }) => Promise<{ regime: string | null } | null>
  }
}

// ─── Universe name resolver ────────────────────────────────────────────────

/**
 * Build a symbol → name map from the universe for the given scope.
 */
function buildNameMap(rankScope: string): Map<string, string> {
  const scope = rankScope as 'sectors' | 'indexes' | 'core'
  const universe = getUniverseForScope(scope)
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
  rankScope: string,
): Promise<{ rows: MarketRotationMonitorRow[]; asOfDate: Date | null }> {
  // Step 1: Find the latest snapshot date for this scope
  const latest = await prisma.marketRotationSnapshot.findFirst({
    where: { rankScope },
    orderBy: { date: 'desc' },
    select: { date: true },
  })

  if (!latest) {
    return { rows: [], asOfDate: null }
  }

  // Step 2: Read all snapshots for that date
  const rawRows = await prisma.marketRotationSnapshot.findMany({
    where: {
      rankScope,
      date: latest.date,
    },
  })

  // Step 3: Transform to monitor rows with name mapping
  const nameMap = buildNameMap(rankScope)
  const rows = rawRows.map(raw => toMonitorRow(raw, nameMap))

  return { rows, asOfDate: latest.date }
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
  const row = await prisma.marketBreadthDaily.findFirst({
    where: { universeKey: DEFAULT_UNIVERSE_KEY },
    orderBy: { date: 'desc' },
    select: { regime: true },
  })

  if (!row) {
    return 'unknown'
  }

  return toMarketState(row.regime)
}

/**
 * getMonitorComparisonDate
 *
 * Checks if the latest snapshots have comparison data (non-null rankDelta2W).
 * If they do, returns the comparison date string (10 trading days back).
 * Otherwise returns null.
 *
 * @param prisma - Prisma client instance (DI)
 * @param rankScope - The ranking scope
 * @returns Comparison date string (YYYY-MM-DD), or null if no comparison data
 */
export async function getMonitorComparisonDate(
  prisma: MonitorPrisma,
  rankScope: string,
): Promise<string | null> {
  // Step 1: Find the latest snapshot date
  const latest = await prisma.marketRotationSnapshot.findFirst({
    where: { rankScope },
    orderBy: { date: 'desc' },
    select: { date: true },
  })

  if (!latest) {
    return null
  }

  // Step 2: Read latest rows to check for comparison data
  const rawRows = await prisma.marketRotationSnapshot.findMany({
    where: {
      rankScope,
      date: latest.date,
    },
  })

  // Step 3: Check if any row has non-null rankDelta2W
  const hasComparisonData = rawRows.some(
    row => row.rankDelta2W != null,
  )

  if (!hasComparisonData) {
    return null
  }

  // Step 4: Get comparison date via getComparisonDate at offset 10
  const comparisonDate = await getComparisonDate(prisma as any, rankScope, 10)

  if (!comparisonDate) {
    return null
  }

  return toDateString(comparisonDate)
}

/**
 * getMonitorTrendSeries
 *
 * Builds comparison-date-normalized 2W sparkline series from persisted
 * snapshots. It uses one qualified date sequence for the whole rank scope.
 */
export async function getMonitorTrendSeries(
  prisma: MonitorPrisma,
  rankScope: 'sectors' | 'indexes' | 'core',
  comparisonDate: Date,
  asOfDate: Date,
): Promise<Map<string, MarketRotationTrendPoint[]>> {
  const universe = getUniverseForScope(rankScope)
  const threshold = Math.ceil(universe.length * 0.9)
  const groups = await prisma.marketRotationSnapshot.groupBy({
    by: ['date'],
    where: { rankScope },
    _count: { symbol: true },
    orderBy: { date: 'desc' },
  })
  const qualifiedDates = groups
    .filter(group => group._count.symbol >= threshold)
    .map(group => group.date)
    .filter(date => date >= comparisonDate && date <= asOfDate)
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
    const base = priceBySymbolDate.get(`${entry.symbol}:${toDateString(comparisonDate)}`)
    const series = qualifiedDates.map((date) => {
      const dateString = toDateString(date)
      const price = priceBySymbolDate.get(`${entry.symbol}:${dateString}`)
      const value = base && price ? roundTrendValue((price / base) * 100) : null
      return { date: dateString, value }
    })
    result.set(entry.symbol, series)
  }

  return result
}
