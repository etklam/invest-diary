import type { EtfDataProvider } from '~/lib/etf-profile/providers/base'
import { yahooEtfProvider } from '~/lib/etf-profile/providers/yahoo'
import { externalFreeEtfProvider } from '~/lib/etf-profile/providers/external-free'

export function getEtfProviders(): EtfDataProvider[] {
  return [yahooEtfProvider, externalFreeEtfProvider]
}
