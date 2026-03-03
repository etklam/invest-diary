import { describe, expect, it } from 'vitest'
import { aggregateEtfProfile } from '~/lib/etf-profile/aggregator'
import type { EtfDataProvider } from '~/lib/etf-profile/providers/base'

describe('etf profile aggregator', () => {
  it('merges valuation fields from multiple providers with field-level source tracking', async () => {
    const providerA: EtfDataProvider = {
      name: 'provider-a',
      async getRisk() {
        return { data: {} }
      },
      async getValuation() {
        return { data: { aum: 1000 } }
      },
      async getRs() {
        return { data: {} }
      },
    }

    const providerB: EtfDataProvider = {
      name: 'provider-b',
      async getRisk() {
        return { data: {} }
      },
      async getValuation() {
        return { data: { expenseRatioPct: 0.2 } }
      },
      async getRs() {
        return { data: {} }
      },
    }

    const result = await aggregateEtfProfile({
      symbol: 'SPY',
      benchmark: 'SPY',
      period: '3m',
      providers: [providerA, providerB],
    })

    expect(result.valuation.aum).toBe(1000)
    expect(result.valuation.expenseRatioPct).toBe(0.2)
    expect(result.meta.sources['valuation.aum']).toBe('provider-a')
    expect(result.meta.sources['valuation.expenseRatioPct']).toBe('provider-b')
  })
})
