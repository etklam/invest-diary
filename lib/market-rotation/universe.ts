/**
 * Universe configuration — defines which symbols belong to each rank scope.
 *
 * V1 has three scopes: sectors, indexes, core.
 *   - sectors: 11 US sector ETFs (SPDR Select Sector + VNQ)
 *   - indexes: 8 benchmark index ETFs
 *   - core:    identical to indexes (future expansion point)
 */

import type { UniverseSymbol } from './pipeline'

export interface UniverseEntry extends UniverseSymbol {
  name: string
}

// ─── Sectors: 11 US sector ETFs ─────────────────────────────────

const SECTORS_UNIVERSE: UniverseEntry[] = [
  { symbol: 'XLK', name: 'Technology', rankScope: 'sectors', groupType: 'sector', sectorName: 'Technology' },
  { symbol: 'XLF', name: 'Financials', rankScope: 'sectors', groupType: 'sector', sectorName: 'Financials' },
  { symbol: 'XLE', name: 'Energy', rankScope: 'sectors', groupType: 'sector', sectorName: 'Energy' },
  { symbol: 'XLU', name: 'Utilities', rankScope: 'sectors', groupType: 'sector', sectorName: 'Utilities' },
  { symbol: 'XLP', name: 'Consumer Staples', rankScope: 'sectors', groupType: 'sector', sectorName: 'Consumer Staples' },
  { symbol: 'XLY', name: 'Consumer Discretionary', rankScope: 'sectors', groupType: 'sector', sectorName: 'Consumer Discretionary' },
  { symbol: 'XLI', name: 'Industrials', rankScope: 'sectors', groupType: 'sector', sectorName: 'Industrials' },
  { symbol: 'XLV', name: 'Health Care', rankScope: 'sectors', groupType: 'sector', sectorName: 'Health Care' },
  { symbol: 'XLB', name: 'Materials', rankScope: 'sectors', groupType: 'sector', sectorName: 'Materials' },
  { symbol: 'XLC', name: 'Communication Services', rankScope: 'sectors', groupType: 'sector', sectorName: 'Communication Services' },
  { symbol: 'VNQ', name: 'Real Estate', rankScope: 'sectors', groupType: 'sector', sectorName: 'Real Estate' },
]

// ─── Indexes: 8 benchmark index ETFs ───────────────────────────

const INDEXES_UNIVERSE: UniverseEntry[] = [
  { symbol: 'SPY', name: 'S&P 500', rankScope: 'indexes', groupType: 'index', sectorName: null },
  { symbol: 'QQQ', name: 'Nasdaq 100', rankScope: 'indexes', groupType: 'index', sectorName: null },
  { symbol: 'DIA', name: 'Dow Jones', rankScope: 'indexes', groupType: 'index', sectorName: null },
  { symbol: 'IWM', name: 'Russell 2000', rankScope: 'indexes', groupType: 'index', sectorName: null },
  { symbol: 'RSP', name: 'S&P 500 Equal Weight', rankScope: 'indexes', groupType: 'index', sectorName: null },
  { symbol: 'VTI', name: 'US Total Market', rankScope: 'indexes', groupType: 'index', sectorName: null },
  { symbol: 'VEA', name: 'Developed ex-US', rankScope: 'indexes', groupType: 'index', sectorName: null },
  { symbol: 'VWO', name: 'Emerging Markets', rankScope: 'indexes', groupType: 'index', sectorName: null },
]

// ─── Core: V1 identical to indexes ─────────────────────────────

const CORE_UNIVERSE: UniverseEntry[] = INDEXES_UNIVERSE.map(entry => ({
  ...entry,
  rankScope: 'core' as const,
  groupType: 'core' as const,
}))

// ─── Public API ─────────────────────────────────────────────────

export function getSectorsUniverse(): UniverseEntry[] {
  return SECTORS_UNIVERSE
}

export function getIndexesUniverse(): UniverseEntry[] {
  return INDEXES_UNIVERSE
}

export function getCoreUniverse(): UniverseEntry[] {
  return CORE_UNIVERSE
}

export function getUniverseForScope(scope: 'sectors' | 'indexes' | 'core'): UniverseEntry[] {
  switch (scope) {
    case 'sectors':
      return getSectorsUniverse()
    case 'indexes':
      return getIndexesUniverse()
    case 'core':
      return getCoreUniverse()
  }
}

/**
 * Returns all unique symbols across every scope.
 * A symbol appearing in multiple scopes is listed only once
 * (first occurrence wins).
 */
export function getAllSymbols(): UniverseEntry[] {
  const seen = new Set<string>()
  const result: UniverseEntry[] = []

  for (const scope of ['sectors', 'indexes', 'core'] as const) {
    for (const entry of getUniverseForScope(scope)) {
      if (!seen.has(entry.symbol)) {
        seen.add(entry.symbol)
        result.push(entry)
      }
    }
  }

  return result
}
