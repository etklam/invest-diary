import type { PortfolioAttentionItem } from '~/lib/portfolio-attention'
import type { PortfolioAggregations } from '~/lib/stocks-view'

export interface PortfolioAttentionResponse {
  items: PortfolioAttentionItem[]
  asOf: string
  coverage: Pick<PortfolioAggregations, 'valuationStatus'> & {
    complete: boolean
    priced: number
    total: number
  }
}
