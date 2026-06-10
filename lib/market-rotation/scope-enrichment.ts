/**
 * Scope-level enrichment — pure function that takes raw snapshots
 * for a single date & rank scope and enriches each with scope-local
 * percentiles.
 *
 * No IO, no Prisma, no side effects.
 * rotationScore and rotationRank are always null here because
 * twoWeekPerformancePercentile requires cross-date comparison data
 * that is only available in enrichWithComparison().
 */

import type { SnapshotData } from './snapshot-builder'
import { calculatePercentile, calculateRotationScore } from './calculations'

// ─── Types ────────────────────────────────────────────────────

export interface EnrichedSnapshot extends SnapshotData {
  rsiPercentile: number | null
  maScorePercentile: number | null
  distanceFromHighScorePercentile: number | null
  rotationScore: number | null
  rotationRank: number | null
}

// ─── Implementation ───────────────────────────────────────────

/**
 * Given raw snapshots for a single date, enrich each with scope-local
 * percentiles, rotation score, and rotation rank.
 *
 * Input snapshots must all belong to the same date and rank scope.
 * Two-week performance percentile is NOT computed here — it requires
 * comparison data from a different date.
 */
export function enrichScopes(snapshots: SnapshotData[]): EnrichedSnapshot[] {
  if (snapshots.length === 0) return []

  // Collect non-null values for each metric across the scope
  const allNonNullRsi14 = snapshots.map(s => s.rsi14).filter((v): v is number => v !== null)
  const allMaScores = snapshots.map(s => s.maScore)
  const allNonNullDistScores = snapshots
    .map(s => s.distanceFromHighScore)
    .filter((v): v is number => v !== null)

  return snapshots.map((snapshot) => {
    const rsiPercentile = snapshot.rsi14 !== null
      ? calculatePercentile(allNonNullRsi14, snapshot.rsi14)
      : null

    const maScorePercentile = calculatePercentile(allMaScores, snapshot.maScore)

    const distanceFromHighScorePercentile = snapshot.distanceFromHighScore !== null
      ? calculatePercentile(allNonNullDistScores, snapshot.distanceFromHighScore)
      : null

    // rotationScore requires all 4 components — twoWeekPerformancePercentile
    // is not available at this stage, so rotationScore is always null.
    const rotationScore = calculateRotationScore({
      rsiPercentile,
      twoWeekPerformancePercentile: null,
      maScorePercentile,
      distanceFromHighScorePercentile,
    })

    return {
      ...snapshot,
      rsiPercentile,
      maScorePercentile,
      distanceFromHighScorePercentile,
      rotationScore,
      rotationRank: null as number | null,
    }
  })
}
