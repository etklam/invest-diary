import type { EtfDataProvider } from '~/lib/etf-profile/providers/base'

export const externalFreeEtfProvider: EtfDataProvider = {
  name: 'external-free',

  async getRisk() {
    return { data: {} }
  },

  async getValuation() {
    return { data: {} }
  },

  async getRs() {
    return { data: {} }
  },
}
