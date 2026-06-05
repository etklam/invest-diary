export interface MarketbeeSnapshot {
  universeKey: string
  date: string
  latestPriceDate: string
  coveragePct: number | null
  isStale: boolean
  regime: string
  score: number | null
  up4: number | null
  down4: number | null
  up4Pct: number | null
  down4Pct: number | null
  ratio10d: number | null
  above40dPct: number | null
  suggestedExposure: string
  message: string
}

export function useMarketbee() {
  const snapshot = ref<MarketbeeSnapshot | null>(null)
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function refresh() {
    loading.value = true
    error.value = null

    try {
      snapshot.value = await $fetch<MarketbeeSnapshot>('/api/market/marketbee/snapshot')
    } catch (err) {
      error.value = err instanceof Error ? err.message : 'Unable to load Marketbee snapshot.'
    } finally {
      loading.value = false
    }
  }

  onMounted(refresh)

  return {
    snapshot,
    loading,
    error,
    refresh,
  }
}
