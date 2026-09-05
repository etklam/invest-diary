/**
 * server/utils/market-rotation-batch.ts
 *
 * Batch job orchestration for Market Rotation Monitor.
 * Reads from market_daily_price, runs the pure-function pipeline,
 * and persists results to market_rotation_snapshot.
 *
 * Designed to be called from:
 *   - API endpoint (manual trigger)
 *   - Scheduled task / cron
 *   - CLI script
 */

import type { EnrichedSnapshotInput } from '~/lib/market-rotation/comparison-enrichment'
import { runSnapshotPipeline, type SymbolPrices } from '~/lib/market-rotation/pipeline'
import { pickLatestQualifiedCandidate, type SnapshotDateCoverage } from '~/lib/market-rotation/qualified-date'
import { getUniverseForScope } from '~/lib/market-rotation/universe'
import {
  fetchDailyOhlcv,
  isYahooRateLimitError,
  persistDailyPrices,
  type DailyPricePrisma,
  type YahooFinanceChartClient,
} from '~/lib/market-data/daily-prices'
import {
  getHistoricalPrices,
  getComparisonWindow,
  getComparisonSnapshots,
  upsertSnapshots,
  type SnapshotUpsertRow,
} from './market-rotation-queries'
import type { DailyPrice } from '~/lib/market-rotation/snapshot-builder'
import { formatErrorContext, logger } from '~/lib/logger'

// ─── Types ──────────────────────────────────────────────────────────

interface PrismaClient {
  marketDailyPrice: Parameters<typeof getHistoricalPrices>[0]['marketDailyPrice'] & DailyPricePrisma['marketDailyPrice']
  marketRotationSnapshot: Parameters<typeof getComparisonWindow>[0]['marketRotationSnapshot']
}

export interface BatchJobResult {
  rankScope: string
  symbolCount: number
  upsertedCount: number
  comparisonDate: Date | null
  errors: Array<{ symbol: string; error: string }>
}

export interface FullBatchResult {
  results: BatchJobResult[]
  totalUpserted: number
  totalErrors: number
}

export interface EnsureCanonicalPricesOptions {
  now?: Date
}

// All canonical symbols trade in the US. Holidays remain provider-owned:
// never create a missing bar, and conservatively wait until 16:00 New York
// even on early-close days before accepting the current session.
function completedPriceFilter(now: Date): (price: { date: Date }) => boolean {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/New_York', year: 'numeric', month: '2-digit',
    day: '2-digit', hour: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const part = (type: string) => parts.find(p => p.type === type)!.value
  const today = `${part('year')}-${part('month')}-${part('day')}`
  const closed = Number(part('hour')) >= 16
  return ({ date }) => {
    const day = date.toISOString().slice(0, 10)
    return date.getUTCDay() !== 0 && date.getUTCDay() !== 6
      && (day < today || (day === today && closed))
  }
}

function getLatestCandidateCoverage(
  symbolPrices: SymbolPrices[],
  universeSize: number,
): SnapshotDateCoverage | null {
  const counts = new Map<string, SnapshotDateCoverage>()

  for (const { prices } of symbolPrices) {
    const latest = prices.at(-1)
    if (!latest) continue

    const existing = counts.get(latest.date)
    if (existing) {
      existing.snapshotCount += 1
    }
    else {
      counts.set(latest.date, {
        date: new Date(`${latest.date}T00:00:00.000Z`),
        snapshotCount: 1,
      })
    }
  }

  return pickLatestQualifiedCandidate([...counts.values()], universeSize)
}

export async function ensureCanonicalPrices(
  prisma: PrismaClient,
  symbols: string[],
  client?: YahooFinanceChartClient,
  options: EnsureCanonicalPricesOptions = {},
): Promise<void> {
  const now = options.now ?? new Date()
  const isCompleted = completedPriceFilter(now)

  for (const symbol of symbols) {
    try {
      const prices = await fetchDailyOhlcv(symbol, '1y', client, now)
      await persistDailyPrices(prisma, prices.filter(isCompleted))
    } catch (error) {
      if (isYahooRateLimitError(error)) {
        logger.runtime.warn('Market rotation Yahoo rate limit', {
          operation: 'market_rotation_price_fetch',
          symbol,
          ...formatErrorContext(error),
        })
      }
      throw error
    }
  }
}

// ─── Scope-level batch ──────────────────────────────────────────────

/**
 * Run the batch job for a single rank scope.
 *
 * 1. Load historical prices for each canonical symbol
 * 2. Find the comparison date (10 qualified snapshots back)
 * 3. Load comparison snapshots from DB
 * 4. Run the pure-function pipeline
 * 5. Persist results
 */
export async function runScopeBatch(
  prisma: PrismaClient,
  rankScope: 'sectors' | 'indexes' | 'core',
  options: EnsureCanonicalPricesOptions & { client?: YahooFinanceChartClient } = {},
): Promise<BatchJobResult> {
  const universe = getUniverseForScope(rankScope)
  const symbols = universe.map(u => u.symbol)
  const errors: Array<{ symbol: string; error: string }> = []

  const now = options.now ?? new Date()
  await ensureCanonicalPrices(prisma, symbols, options.client, { ...options, now })
  const isCompleted = completedPriceFilter(now)

  // Step 1: Load historical prices for all symbols
  const symbolPrices: SymbolPrices[] = []
  for (const entry of universe) {
    try {
      const prices = (await getHistoricalPrices(prisma, entry.symbol))
        .filter(isCompleted)
      if (prices.length > 0) {
        symbolPrices.push({
          meta: entry,
          prices: prices.map((p): DailyPrice => ({
            date: p.date.toISOString().slice(0, 10),
            close: p.close,
            adjustedClose: p.adjustedClose,
          })),
        })
      }
    }
    catch (error) {
      const errorContext = formatErrorContext(error)
      errors.push({
        symbol: entry.symbol,
        error: error instanceof Error
          ? `${errorContext.errorType}: ${errorContext.error}`
          : errorContext.error,
      })
    }
  }

  // Step 2: Resolve the canonical comparison window. The newest candidate
  // date is included before applying the ten-qualified-date offset when this
  // run already has enough symbols to qualify it.
  const candidate = getLatestCandidateCoverage(symbolPrices, universe.length)
  const comparisonWindow = await getComparisonWindow(prisma, rankScope, { candidate })
  const comparisonDate = comparisonWindow.comparisonDate

  // Step 3: Load comparison snapshots
  let comparisonSnapshots: EnrichedSnapshotInput[] = []
  if (comparisonDate) {
    const rows = await getComparisonSnapshots(prisma, rankScope, comparisonDate)
    comparisonSnapshots = rows.map(row => ({
      ...row,
      rankScope: row.rankScope as string,
      adjustedClose: row.adjustedClose as number | null,
      rsi14: row.rsi14 as number | null,
      rsiPercentile: row.rsiPercentile as number | null,
      maScore: row.maScore as number,
      maScorePercentile: row.maScorePercentile as number | null,
      distanceFromHighScore: row.distanceFromHighScore as number | null,
      distanceFromHighScorePercentile: row.distanceFromHighScorePercentile as number | null,
      maStatus: row.maStatus as string,
      percentFromHigh: row.percentFromHigh as number | null,
    }))
  }

  // Step 4: Run pipeline
  const result = runSnapshotPipeline(symbolPrices, comparisonSnapshots)

  // Step 5: Persist
  const upsertRows: SnapshotUpsertRow[] = result.latest.map((snap) => {
    const dateStr = snap.date as string
    return {
      date: new Date(dateStr),
      symbol: snap.symbol,
      rankScope: snap.rankScope as string,
      groupType: snap.groupType as string,
      sectorName: snap.sectorName as string | null,
      lastPrice: snap.lastPrice as number | null,
      adjustedClose: snap.adjustedClose as number | null,
      dailyChangePct: snap.dailyChangePct as number | null,
      weeklyChangePct: snap.weeklyChangePct as number | null,
      twoWeekPerformancePct: snap.twoWeekPerformancePct as number | null,
      rsi14: snap.rsi14 as number | null,
      rsiPercentile: snap.rsiPercentile as number | null,
      rsiDelta2W: snap.rsiDelta2W as number | null,
      ema10: snap.ema10 as number | null,
      ema20: snap.ema20 as number | null,
      sma50: snap.sma50 as number | null,
      sma200: snap.sma200 as number | null,
      above10d: snap.above10d as boolean | null,
      above20d: snap.above20d as boolean | null,
      above50d: snap.above50d as boolean | null,
      above200d: snap.above200d as boolean | null,
      maScore: snap.maScore as number | null,
      maScorePercentile: snap.maScorePercentile as number | null,
      maStatus: snap.maStatus as string | null,
      rolling252dHigh: snap.rolling252dHigh as number | null,
      percentFromHigh: snap.percentFromHigh as number | null,
      distanceFromHighScore: snap.distanceFromHighScore as number | null,
      distanceFromHighScorePercentile: snap.distanceFromHighScorePercentile as number | null,
      rotationScore: snap.rotationScore as number | null,
      rotationScoreDelta2W: snap.rotationScoreDelta2W as number | null,
      rotationRank: snap.rotationRank as number | null,
      rankDelta2W: snap.rankDelta2W as number | null,
      signal: snap.signal as string | null,
      signalStatus: snap.signalStatus as string,
    }
  })

  const upsertedCount = await upsertSnapshots(prisma, upsertRows)

  return {
    rankScope,
    symbolCount: symbols.length,
    upsertedCount,
    comparisonDate,
    errors,
  }
}

// ─── Full batch ─────────────────────────────────────────────────────

/**
 * Run the batch job for all rank scopes.
 */
export async function runFullBatch(prisma: PrismaClient): Promise<FullBatchResult> {
  const scopes: Array<'sectors' | 'indexes' | 'core'> = ['sectors', 'indexes', 'core']
  const results: BatchJobResult[] = []

  for (const scope of scopes) {
    const result = await runScopeBatch(prisma, scope)
    results.push(result)
  }

  return {
    results,
    totalUpserted: results.reduce((sum, r) => sum + r.upsertedCount, 0),
    totalErrors: results.reduce((sum, r) => sum + r.errors.length, 0),
  }
}
