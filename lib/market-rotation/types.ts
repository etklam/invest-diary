export const rankScopes = ['sectors', 'indexes', 'core'] as const

export type RankScope = typeof rankScopes[number]

export function isRankScope(value: string): value is RankScope {
  return rankScopes.includes(value as RankScope)
}

/**
 * Group type — distinguishes how a universe entry should be classified.
 *
 * T2 extension: `core` (legacy V1) was split into:
 *   - `core_etf`     — ETFs in the core scope (SPY, QQQ, SMH, TLT, BIL, ...)
 *   - `mega_cap`     — Mega-cap single stocks (NVDA, MSFT, AAPL, ...)
 *   - `single_stock` — Smaller / thematic single stocks (MU, PLTR, CRWV)
 *
 * Legacy `sector` / `index` are unchanged. The legacy `core` literal is kept
 * for backwards compatibility with previously persisted snapshots only;
 * new universe entries should use one of the split values above.
 */
export const groupTypes = [
  'sector',
  'index',
  'core',
  'core_etf',
  'mega_cap',
  'single_stock',
] as const

export type GroupType = typeof groupTypes[number]

/**
 * Beta bucket — coarse risk/beta classification used by the beta-allocation
 * and portfolio-exposure layers. Derived from groupType + theme, not 1:1.
 */
export const betaBuckets = [
  'core_index',
  'high_beta',
  'mega_cap',
  'single_stock',
  'defensive',
  'cash_proxy',
] as const

export type BetaBucket = typeof betaBuckets[number]

/**
 * Rank pool — which percentile pool a snapshot belongs to within a scope.
 *
 * For sectors / indexes scopes, there is a single pool per scope.
 * For the core scope, the pool is split:
 *   - `core_etf`        — all `core_etf` groupType entries
 *   - `mega_cap_stock`  — `mega_cap` + `single_stock` entries (combined)
 */
export const coreRankPools = ['core_etf', 'mega_cap_stock'] as const

export type CoreRankPool = typeof coreRankPools[number]

export type { MarketState } from './state'
export type { BreadthCondition, BreadthConfirmation } from './breadth'
export type { MaStatus, RotationSignal, SignalStatus } from './signal'
