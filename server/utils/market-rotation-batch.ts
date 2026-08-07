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
import { normalizeYahooSymbol } from '~/lib/market-data/yahoo'
import { runYahooRequest } from '~/lib/market-data/yahoo-request-queue'
import { parseDailyPrices, resolveRangeStart, type DailyPriceInput, type YahooChartQuote } from '~/lib/market-state/update-breadth-utils'
import {
  getHistoricalPrices,
  getComparisonWindow,
  getComparisonSnapshots,
  upsertSnapshots,
  type SnapshotUpsertRow,
} from './market-rotation-queries'
import type { DailyPrice } from '~/lib/market-rotation/snapshot-builder'

// ─── Types ──────────────────────────────────────────────────────────

interface PrismaClient {
  marketDailyPrice: Parameters<typeof getHistoricalPrices>[0]['marketDailyPrice'] & {
    upsert: (args: {
      where: { symbol_date: { symbol: string; date: Date } }
      update: {
        open: number
        high: number
        low: number
        close: number
        adjustedClose: number
        volume: bigint
      }
      create: DailyPriceInput
    }) => Promise<unknown>
  }
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
  minLookbackDays?: number
  staleAfterDays?: number
  now?: Date
}

interface YahooFinanceClient {
  chart: (symbol: string, options: Record<string, unknown>) => Promise<{ quotes: unknown[] }>
}

const DEFAULT_MIN_LOOKBACK_DAYS = 252
const DEFAULT_STALE_AFTER_DAYS = 7

let yahooFinanceClient: YahooFinanceClient | null = null

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

async function getYahooFinanceClient(): Promise<YahooFinanceClient> {
  if (yahooFinanceClient) return yahooFinanceClient

  const module = await import('yahoo-finance2')
  yahooFinanceClient = new module.default() as unknown as YahooFinanceClient
  return yahooFinanceClient
}

async function fetchCanonicalPrices(symbol: string, client: YahooFinanceClient): Promise<DailyPriceInput[]> {
  const normalized = normalizeYahooSymbol(symbol)
  const chart = await runYahooRequest(
    `canonical:${normalized}`,
    () => client.chart(normalized, {
      period1: resolveRangeStart('1y'),
      period2: new Date(),
      interval: '1d',
      return: 'array',
    }),
  )

  return parseDailyPrices(symbol, chart.quotes as YahooChartQuote[])
}

async function upsertCanonicalPrices(prisma: PrismaClient, prices: DailyPriceInput[]): Promise<void> {
  for (const price of prices) {
    await prisma.marketDailyPrice.upsert({
      where: {
        symbol_date: {
          symbol: price.symbol,
          date: price.date,
        },
      },
      update: {
        open: price.open,
        high: price.high,
        low: price.low,
        close: price.close,
        adjustedClose: price.adjustedClose,
        volume: price.volume,
      },
      create: price,
    })
  }
}

export async function ensureCanonicalPrices(
  prisma: PrismaClient,
  symbols: string[],
  client?: YahooFinanceClient,
  options: EnsureCanonicalPricesOptions = {},
): Promise<void> {
  const minLookbackDays = options.minLookbackDays ?? DEFAULT_MIN_LOOKBACK_DAYS
  const staleAfterDays = options.staleAfterDays ?? DEFAULT_STALE_AFTER_DAYS
  const now = options.now ?? new Date()

  for (const symbol of symbols) {
    let existing: Awaited<ReturnType<typeof getHistoricalPrices>>
    try {
      existing = await getHistoricalPrices(prisma, symbol, minLookbackDays)
    } catch {
      continue
    }

    const latest = existing.at(-1)
    const latestAgeMs = latest ? now.getTime() - latest.date.getTime() : Number.POSITIVE_INFINITY
    const isFresh = latestAgeMs <= staleAfterDays * 24 * 60 * 60 * 1000
    const hasEnoughLookback = existing.length >= minLookbackDays

    if (hasEnoughLookback && isFresh) {
      continue
    }

    const yahooFinance = client ?? await getYahooFinanceClient()
    try {
      const prices = await fetchCanonicalPrices(symbol, yahooFinance)
      await upsertCanonicalPrices(prisma, prices)
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      const lower = message.toLowerCase()
      if (lower.includes('rate') || lower.includes('429') || lower.includes('too many')) {
        console.warn(`[market-rotation] ${symbol} Yahoo rate-limit：${message}`)
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
): Promise<BatchJobResult> {
  const universe = getUniverseForScope(rankScope)
  const symbols = universe.map(u => u.symbol)
  const errors: Array<{ symbol: string; error: string }> = []

  await ensureCanonicalPrices(prisma, symbols)

  // Step 1: Load historical prices for all symbols
  const symbolPrices: SymbolPrices[] = []
  for (const entry of universe) {
    try {
      const prices = await getHistoricalPrices(prisma, entry.symbol)
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
      errors.push({ symbol: entry.symbol, error: String(error) })
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
