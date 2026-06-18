/**
 * usePortfolioExposure
 *
 * Fetches portfolio exposure vs suggested beta allocation from
 * GET /api/stocks/exposure. Safe to render even when rotation
 * data is missing (server returns marketState='unknown').
 */

import { computed } from 'vue'
import type { PortfolioExposure, ExposureGap, SuggestedAllocation } from '~/lib/portfolio-exposure/exposure'
import type { BetaAllocationResult } from '~/lib/beta-allocation/policy'
import type { MarketState } from '~/lib/market-rotation/state'

export interface PortfolioExposurePayload {
  exposure: PortfolioExposure
  gaps: ExposureGap[]
  suggestedAllocation: SuggestedAllocation
  betaAllocation: BetaAllocationResult
  marketState: MarketState
  lastUpdated: string | null
}

export function usePortfolioExposure() {
  const { data, pending, error, refresh } = useFetch<PortfolioExposurePayload | null>('/api/stocks/exposure', {
    default: () => null,
  })

  const payload = computed<PortfolioExposurePayload | null>(() => data.value ?? null)
  const exposure = computed<PortfolioExposure | null>(() => payload.value?.exposure ?? null)
  const gaps = computed<ExposureGap[]>(() => payload.value?.gaps ?? [])
  const suggestedAllocation = computed<SuggestedAllocation | null>(
    () => payload.value?.suggestedAllocation ?? null,
  )
  const betaAllocation = computed<BetaAllocationResult | null>(
    () => payload.value?.betaAllocation ?? null,
  )
  const marketState = computed<MarketState | null>(() => payload.value?.marketState ?? null)
  const lastUpdated = computed<Date | null>(() => {
    const raw = payload.value?.lastUpdated
    return raw ? new Date(raw) : null
  })

  const hasMarketData = computed(() => marketState.value !== null && marketState.value !== 'unknown')

  return {
    payload,
    exposure,
    gaps,
    suggestedAllocation,
    betaAllocation,
    marketState,
    lastUpdated,
    hasMarketData,
    pending,
    error,
    refresh,
  }
}
