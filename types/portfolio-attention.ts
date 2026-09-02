/**
 * Compatibility type entrypoint for UI callers. The canonical wire types
 * live under `lib/contracts/portfolio` and do not depend on server modules.
 */
export type {
  PortfolioAttentionItem,
  PortfolioAttentionResponse,
} from '~/lib/contracts/portfolio'
