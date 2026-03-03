import { fetchQuote } from '~/lib/yahoo-finance'
import type { EtfDataProvider } from '~/lib/etf-profile/providers/base'

export const yahooEtfProvider: EtfDataProvider = {
  name: 'yahoo',

  async getRisk(symbol) {
    try {
      const quote = await fetchQuote(symbol)
      return {
        data: {
          volume: null,
        },
        asOf: quote.lastUpdateTime,
      }
    } catch {
      return { data: {} }
    }
  },

  async getValuation() {
    return { data: {} }
  },

  async getRs() {
    return { data: {} }
  },
}
