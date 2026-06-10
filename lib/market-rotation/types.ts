export const rankScopes = ['sectors', 'indexes', 'core'] as const

export type RankScope = typeof rankScopes[number]

export function isRankScope(value: string): value is RankScope {
  return rankScopes.includes(value as RankScope)
}

export type { MarketState } from './state'
export type { BreadthCondition, BreadthConfirmation } from './breadth'
export type { MaStatus, RotationSignal, SignalStatus } from './signal'
