/**
 * server/utils/market-rotation-queries.ts
 *
 * Query layer for market rotation batch jobs.
 * Reads from market_daily_price and market_rotation_snapshot,
 * writes back to market_rotation_snapshot.
 *
 * All functions accept a prisma instance as the first argument (DI pattern)
 * for testability and batch job usage.
 */

import { toNumber, type DecimalLike } from '~/lib/market-rotation/decimal'
import { isRankScope, type RankScope } from '~/lib/market-rotation/types'
import { getUniverseForScope } from '~/lib/market-rotation/universe'
import {
  COMPARISON_OFFSET,
  isQualifiedSnapshotCount,
  loadQualifiedDatesForScope,
  pickComparisonDate,
  resolveQualifiedDateWindow,
  type QualifiedDateWindow,
} from '~/lib/market-rotation/qualified-date'

// ─── Interfaces ────────────────────────────────────────────────────────────

export interface DailyPriceRow {
  date: Date
  close: number
  adjustedClose: number
}

export interface ComparisonSnapshotRow {
  id: bigint
  date: Date
  symbol: string
  rankScope: string
  rotationScore: number | null
  rotationRank: number | null
  rotationScoreDelta2W: number | null
  rankDelta2W: number | null
  signal: string | null
  signalStatus: string
  [key: string]: unknown
}

export interface SnapshotUpsertRow {
  date: Date
  symbol: string
  rankScope: string
  groupType: string
  sectorName: string | null
  lastPrice: number | null
  adjustedClose: number | null
  dailyChangePct: number | null
  weeklyChangePct: number | null
  twoWeekPerformancePct: number | null
  rsi14: number | null
  rsiPercentile: number | null
  rsiDelta2W: number | null
  ema10: number | null
  ema20: number | null
  sma50: number | null
  sma200: number | null
  above10d: boolean | null
  above20d: boolean | null
  above50d: boolean | null
  above200d: boolean | null
  maScore: number | null
  maScorePercentile: number | null
  maStatus: string | null
  rolling252dHigh: number | null
  percentFromHigh: number | null
  distanceFromHighScore: number | null
  distanceFromHighScorePercentile: number | null
  rotationScore: number | null
  rotationScoreDelta2W: number | null
  rotationRank: number | null
  rankDelta2W: number | null
  signal: string | null
  signalStatus: string
}

export interface ComparisonWindowCandidate {
  date: Date
  snapshotCount: number
}

export interface ComparisonWindowOptions {
  /** Candidate snapshots produced by the current batch before persistence. */
  candidate?: ComparisonWindowCandidate | null
  /** Qualified-date offset; defaults to the accepted 2W offset (10). */
  offset?: number
}

export interface MarketRotationComparisonWindow extends QualifiedDateWindow {
  rankScope: RankScope
}

interface MarketRotationPrisma {
  marketDailyPrice: {
    findMany: (args: {
      where: { symbol: string }
      orderBy: { date: 'desc' }
      take: number
      select: { date: true; close: true; adjustedClose: true }
    }) => Promise<Array<{
      date: Date
      close: DecimalLike
      adjustedClose: DecimalLike
    }>>
  }
  marketRotationSnapshot: {
    groupBy: (args: {
      by: ['date']
      where: { rankScope: string; symbol?: { in: string[] } }
      _count: { symbol: true }
      orderBy: { date: 'desc' }
    }) => Promise<Array<{
      date: Date
      _count: { symbol: number }
    }>>
    findMany: (args: {
      where: { rankScope: string; date: Date }
    }) => Promise<Array<Record<string, unknown>>>
    upsert: (args: {
      where: { rankScope_symbol_date: { rankScope: string; symbol: string; date: Date } }
      update: Record<string, unknown>
      create: Record<string, unknown>
    }) => Promise<{ id: bigint }>
  }
}

// ─── Query functions ───────────────────────────────────────────────────────

/**
 * getHistoricalPrices
 *
 * Reads historical daily prices for a symbol from market_daily_price.
 * Returns rows sorted by date ascending, with Decimal values converted to number.
 * Defaults to last 300 trading days (enough for RSI14, EMA20, SMA50, SMA200 with buffer).
 */
export async function getHistoricalPrices(
  prisma: MarketRotationPrisma,
  symbol: string,
  limit = 300,
): Promise<DailyPriceRow[]> {
  const rows = await prisma.marketDailyPrice.findMany({
    where: { symbol },
    orderBy: { date: 'desc' },
    take: limit,
    select: {
      date: true,
      close: true,
      adjustedClose: true,
    },
  })

  // Reverse to ascending order (oldest first) for indicator calculations
  return rows.reverse().map(row => ({
    date: row.date,
    close: toNumber(row.close)!,
    adjustedClose: toNumber(row.adjustedClose)!,
  }))
}

/**
 * getLatestQualifiedDate
 *
 * Finds the most recent date where at least 90% of the given symbols
 * have snapshot records in market_rotation_snapshot.
 *
 * The qualification logic (90% threshold + groupBy shape) lives in
 * `lib/market-rotation/qualified-date.ts` — this function is a thin
 * Prisma adapter that returns the head of the desc-sorted qualified list.
 *
 * @param prisma - Prisma client instance
 * @param rankScope - The ranking scope (e.g., 'SP500')
 * @param symbols - Array of canonical symbols to check coverage against
 * @returns The latest qualified Date, or null if none found
 */
export async function getLatestQualifiedDate(
  prisma: MarketRotationPrisma,
  rankScope: string,
  symbols: string[],
): Promise<Date | null> {
  const qualifiedDates = await loadQualifiedDatesForScope(
    prisma,
    rankScope,
    symbols.length,
    symbols,
  )
  return qualifiedDates[0] ?? null
}

/**
 * Resolve one canonical qualified-date window for a Rank Scope.
 *
 * When a batch supplies a candidate date, its successful snapshot count is
 * checked against the same scope threshold before it is inserted into the
 * sequence. This is what lets pre-persistence snapshot generation and
 * post-persistence monitor reads select the same comparison boundary.
 */
export async function getComparisonWindow(
  prisma: MarketRotationPrisma,
  rankScope: RankScope,
  options: ComparisonWindowOptions = {},
): Promise<MarketRotationComparisonWindow> {
  const universe = getUniverseForScope(rankScope)
  const qualifiedDates = await loadQualifiedDatesForScope(
    prisma,
    rankScope,
    universe.length,
    universe.map(entry => entry.symbol),
  )
  const candidate = options.candidate

  const window = resolveQualifiedDateWindow(qualifiedDates, {
    candidateDate: candidate?.date,
    candidateIsQualified: candidate != null
      && isQualifiedSnapshotCount(candidate.snapshotCount, universe.length),
    offset: options.offset ?? COMPARISON_OFFSET,
  })

  return {
    rankScope,
    ...window,
  }
}

/**
 * getComparisonDate
 *
 * Gets the date at `offset` position from the list of fully qualified dates
 * (dates where at least 90% of canonical symbols have snapshots), ordered
 * descending.
 *
 * offset=0 → most recent qualified date
 * offset=10 → 11th most recent qualified date (approximately 2 weeks back)
 *
 * Per ADR-0004 the groupBy filters by `symbol: { in: canonicalUniverse }`
 * so stale or non-canonical rows in the snapshot table do not inflate
 * coverage. This aligns with `getLatestQualifiedDate` and
 * `getMonitorTrendSeries` — the canonical universe is derived once here so
 * callers (batch job, monitor handler) do not have to pass it in.
 *
 * The qualification logic (90% threshold + groupBy shape) lives in
 * `lib/market-rotation/qualified-date.ts`. This function is a thin Prisma
 * adapter that picks the offset-th qualified date.
 *
 * @param prisma - Prisma client instance
 * @param rankScope - The ranking scope
 * @param offset - Number of positions back from the most recent qualified date
 * @returns The Date at the offset position, or null if not enough dates
 */
export async function getComparisonDate(
  prisma: MarketRotationPrisma,
  rankScope: string,
  offset: number = COMPARISON_OFFSET,
  options: ComparisonWindowOptions = {},
): Promise<Date | null> {
  if (isRankScope(rankScope)) {
    const window = await getComparisonWindow(prisma, rankScope, { ...options, offset })
    return window.comparisonDate
  }

  const universe = isRankScope(rankScope) ? getUniverseForScope(rankScope) : []
  const universeSymbols = universe.map(entry => entry.symbol)

  const qualifiedDates = await loadQualifiedDatesForScope(
    prisma,
    rankScope,
    universe.length,
    universeSymbols,
  )

  return pickComparisonDate(qualifiedDates, offset)
}

/**
 * getComparisonSnapshots
 *
 * Reads all snapshot records for a given rankScope and date.
 * Returns rows with Decimal values converted to number where applicable.
 *
 * @param prisma - Prisma client instance
 * @param rankScope - The ranking scope
 * @param date - The target comparison date
 * @returns Array of comparison snapshot rows
 */
export async function getComparisonSnapshots(
  prisma: MarketRotationPrisma,
  rankScope: string,
  date: Date,
): Promise<ComparisonSnapshotRow[]> {
  const rows = await prisma.marketRotationSnapshot.findMany({
    where: {
      rankScope,
      date,
    },
  })

  return rows.map((row) => {
    const r = row as Record<string, unknown>
    return {
      ...r,
      // Override Decimal fields with converted number values
      rotationScore: toNumber(r.rotationScore as DecimalLike),
      rotationRank: r.rotationRank as number | null,
      rotationScoreDelta2W: toNumber(r.rotationScoreDelta2W as DecimalLike),
      rankDelta2W: r.rankDelta2W as number | null,
      signal: r.signal as string | null,
      signalStatus: r.signalStatus as string,
    } as ComparisonSnapshotRow
  })
}

/**
 * upsertSnapshots
 *
 * Upserts a batch of snapshot records into market_rotation_snapshot.
 * Uses the unique composite key (rankScope, symbol, date) for deduplication.
 *
 * @param prisma - Prisma client instance
 * @param snapshots - Array of snapshot data to upsert
 * @returns Number of snapshots upserted
 */
export async function upsertSnapshots(
  prisma: MarketRotationPrisma,
  snapshots: SnapshotUpsertRow[],
): Promise<number> {
  if (snapshots.length === 0) return 0

  const fieldNameMap: Record<string, string> = {
    twoWeekPerformancePct: 'two_week_performance_pct',
    rsiPercentile: 'rsi_percentile',
    rsiDelta2W: 'rsi_delta_2w',
    maScorePercentile: 'ma_score_percentile',
    maStatus: 'ma_status',
    rolling252dHigh: 'rolling_252d_high',
    percentFromHigh: 'percent_from_high',
    distanceFromHighScore: 'distance_from_high_score',
    distanceFromHighScorePercentile: 'distance_from_high_score_percentile',
    rotationScore: 'rotation_score',
    rotationScoreDelta2W: 'rotation_score_delta_2w',
    rotationRank: 'rotation_rank',
    rankDelta2W: 'rank_delta_2w',
    signalStatus: 'signal_status',
    dailyChangePct: 'daily_change_pct',
    weeklyChangePct: 'weekly_change_pct',
    sectorName: 'sector_name',
    lastPrice: 'last_price',
    adjustedClose: 'adjusted_close',
    groupType: 'group_type',
    rankScope: 'rank_scope',
  }

  for (const snapshot of snapshots) {
    const data: Record<string, unknown> = {
      date: snapshot.date,
      symbol: snapshot.symbol,
      rankScope: snapshot.rankScope,
      groupType: snapshot.groupType,
      sectorName: snapshot.sectorName,
      lastPrice: snapshot.lastPrice,
      adjustedClose: snapshot.adjustedClose,
      dailyChangePct: snapshot.dailyChangePct,
      weeklyChangePct: snapshot.weeklyChangePct,
      twoWeekPerformancePct: snapshot.twoWeekPerformancePct,
      rsi14: snapshot.rsi14,
      rsiPercentile: snapshot.rsiPercentile,
      rsiDelta2W: snapshot.rsiDelta2W,
      ema10: snapshot.ema10,
      ema20: snapshot.ema20,
      sma50: snapshot.sma50,
      sma200: snapshot.sma200,
      above10d: snapshot.above10d,
      above20d: snapshot.above20d,
      above50d: snapshot.above50d,
      above200d: snapshot.above200d,
      maScore: snapshot.maScore,
      maScorePercentile: snapshot.maScorePercentile,
      maStatus: snapshot.maStatus,
      rolling252dHigh: snapshot.rolling252dHigh,
      percentFromHigh: snapshot.percentFromHigh,
      distanceFromHighScore: snapshot.distanceFromHighScore,
      distanceFromHighScorePercentile: snapshot.distanceFromHighScorePercentile,
      rotationScore: snapshot.rotationScore,
      rotationScoreDelta2W: snapshot.rotationScoreDelta2W,
      rotationRank: snapshot.rotationRank,
      rankDelta2W: snapshot.rankDelta2W,
      signal: snapshot.signal,
      signalStatus: snapshot.signalStatus,
    }

    await prisma.marketRotationSnapshot.upsert({
      where: {
        rankScope_symbol_date: {
          rankScope: snapshot.rankScope,
          symbol: snapshot.symbol,
          date: snapshot.date,
        },
      },
      update: data,
      create: data,
    })
  }

  return snapshots.length
}
