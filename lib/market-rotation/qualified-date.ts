/**
 * lib/market-rotation/qualified-date.ts
 *
 * Deep module for the "Qualified Snapshot Date" domain concept (ADR-0004).
 *
 * A Qualified Snapshot Date is a trading day where at least 90% of a Rank
 * Scope's canonical universe successfully produced a Market Rotation Snapshot.
 * The 2W Comparison Date is the qualified snapshot date that is
 * `COMPARISON_OFFSET` positions before the most recent qualified date.
 *
 * This module is split into two layers:
 *
 *   1. Pure logic — threshold computation, qualified-date filtering, and
 *      comparison-date selection. No Prisma, no I/O, trivially unit-testable.
 *   2. Prisma helper — a single `loadQualifiedDatesForScope` that wraps the
 *      canonical groupBy query so callers do not re-implement it. Query layer
 *      functions in `server/utils/market-rotation-queries.ts` and
 *      `server/utils/market-rotation-monitor-queries.ts` delegate to these.
 *
 * Why centralize: the `Math.ceil(N * 0.9)` magic number and the offset=10
 * magic number were previously duplicated in three places. ADR-0004 treats
 * both as first-class domain constants, so they live here.
 */

// ─── Domain constants (ADR-0004) ─────────────────────────────────────────

/**
 * Minimum fraction of the canonical universe that must have snapshots for a
 * date to be considered "qualified". ADR-0004 fixes this at 90%.
 */
export const QUALIFICATION_THRESHOLD_RATIO = 0.9 as const

/**
 * Number of qualified snapshot positions to step back from the most recent
 * qualified date when resolving the 2W comparison date. ADR-0004 fixes this
 * at 10 (approximately two trading weeks).
 */
export const COMPARISON_OFFSET = 10 as const

// ─── Types ───────────────────────────────────────────────────────────────

/**
 * Minimal shape returned by Prisma's `groupBy({ by: ['date'], _count })`.
 * Using a structural type keeps this module Prisma-agnostic.
 */
export interface DateCountGroup {
  date: Date
  count: number
}

// ─── Pure logic ──────────────────────────────────────────────────────────

/**
 * Compute the minimum snapshot count required for a date to qualify.
 *
 * @param universeSize - Number of canonical symbols in the rank scope.
 * @returns `ceil(universeSize * QUALIFICATION_THRESHOLD_RATIO)`, floored to 1
 *          so a degenerate universe (size 0) still has a sane threshold.
 */
export function computeThreshold(universeSize: number): number {
  if (universeSize <= 0) return 1
  return Math.ceil(universeSize * QUALIFICATION_THRESHOLD_RATIO)
}

/**
 * Filter `groups` down to the dates that meet the qualification threshold.
 *
 * This is a PURE function — it does not re-sort the input. Callers are
 * responsible for passing in the order they expect out (Prisma's `groupBy`
 * with `orderBy: { date: 'desc' }` yields descending order, which is what
 * `pickComparisonDate` expects).
 *
 * @param groups - Snapshot-count-per-date records (any order).
 * @param universeSize - Canonical universe size for the rank scope.
 * @returns Qualified dates in the SAME order as the input.
 */
export function filterQualifiedDates(
  groups: readonly DateCountGroup[],
  universeSize: number,
): Date[] {
  const threshold = computeThreshold(universeSize)
  return groups
    .filter(group => group.count >= threshold)
    .map(group => group.date)
}

/**
 * Pick the 2W comparison date from a desc-sorted list of qualified dates.
 *
 * Contract:
 *   - Input MUST be sorted descending (most recent first). This matches the
 *     output of `filterQualifiedDates` when fed a Prisma `groupBy` with
 *     `orderBy: { date: 'desc' }`.
 *   - `offset=0` returns the most recent qualified date.
 *   - `offset=N` returns the (N+1)-th most recent qualified date.
 *   - Returns `null` when the list is empty or shorter than `offset + 1`.
 *
 * @param qualifiedDatesDesc - Qualified dates sorted descending.
 * @param offset - Positions back from the most recent qualified date.
 *                 Defaults to `COMPARISON_OFFSET` (=10) per ADR-0004.
 */
export function pickComparisonDate(
  qualifiedDatesDesc: readonly Date[],
  offset: number = COMPARISON_OFFSET,
): Date | null {
  return qualifiedDatesDesc[offset] ?? null
}

// ─── Prisma helper ───────────────────────────────────────────────────────

/**
 * Minimal structural type for the `marketRotationSnapshot.groupBy` call.
 * Keeps this module decoupled from the full Prisma client type.
 */
interface GroupByCapable {
  marketRotationSnapshot: {
    groupBy: (args: {
      by: ['date']
      where: { rankScope: string; symbol?: { in: string[] } }
      _count: { symbol: true }
      orderBy: { date: 'desc' }
    }) => Promise<Array<{ date: Date; _count: { symbol: number } }>>
  }
}

/**
 * Load the qualified snapshot dates for a rank scope, sorted descending.
 *
 * This is the single canonical entry point for "which dates are qualified".
 * Both `getLatestQualifiedDate` / `getComparisonDate` in the query layer and
 * `getMonitorTrendSeries` in the monitor query layer delegate to this so the
 * groupBy shape and the 90% threshold live in exactly one place.
 *
 * @param prisma - Prisma client (or any structurally-compatible mock).
 * @param rankScope - e.g. 'sectors', 'indexes', 'core'.
 * @param universeSize - Canonical universe size for the scope.
 * @param symbols - Optional symbol filter. When omitted, the groupBy runs
 *                  against all symbols in the scope (matching the legacy
 *                  `getComparisonDate` behavior).
 * @returns Qualified dates sorted descending (most recent first).
 */
export async function loadQualifiedDatesForScope(
  prisma: GroupByCapable,
  rankScope: string,
  universeSize: number,
  symbols?: readonly string[],
): Promise<Date[]> {
  const groups = await prisma.marketRotationSnapshot.groupBy({
    by: ['date'],
    where: {
      rankScope,
      ...(symbols && symbols.length > 0 ? { symbol: { in: [...symbols] } } : {}),
    },
    _count: { symbol: true },
    orderBy: { date: 'desc' },
  })

  return filterQualifiedDates(
    groups.map(g => ({ date: g.date, count: g._count.symbol })),
    universeSize,
  )
}
