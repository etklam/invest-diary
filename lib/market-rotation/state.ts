export type MarketState = 'risk_on' | 'neutral' | 'defensive' | 'risk_off' | 'unknown'

export type InternalRegime =
  | 'BULLISH_THRUST'
  | 'RISK_ON'
  | 'NEUTRAL'
  | 'RISK_OFF'
  | 'CAPITULATION_WATCH'

export function toMarketState(regime: string | null | undefined): MarketState {
  if (regime === 'BULLISH_THRUST' || regime === 'RISK_ON') return 'risk_on'
  if (regime === 'NEUTRAL') return 'neutral'
  if (regime === 'RISK_OFF') return 'defensive'
  if (regime === 'CAPITULATION_WATCH') return 'risk_off'
  return 'unknown'
}
