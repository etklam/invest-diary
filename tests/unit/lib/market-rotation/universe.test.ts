import { describe, expect, it } from 'vitest'
import {
  getSectorsUniverse,
  getIndexesUniverse,
  getCoreUniverse,
  getUniverseForScope,
  getAllSymbols,
} from '~/lib/market-rotation/universe'

// ─── Helpers ────────────────────────────────────────────────────

const EXCLUDED_FROM_SECTORS = ['SPY', 'MAGS', 'QQQE', 'RSP'] as const

const EXPECTED_SECTOR_SYMBOLS = [
  'XLK', 'XLF', 'XLE', 'XLU', 'XLP', 'XLY', 'XLI', 'XLV', 'XLB', 'XLC', 'XLRE',
] as const

const EXPECTED_INDEX_SYMBOLS = [
  'SPY', 'QQQ', 'DIA', 'IWM', 'RSP', 'VTI', 'VEA', 'VWO',
] as const

// ─── Sectors ────────────────────────────────────────────────────

describe('getSectorsUniverse', () => {
  it('excludes non-sector ETFs: SPY, MAGS, QQQE, RSP', () => {
    const universe = getSectorsUniverse()
    for (const symbol of EXCLUDED_FROM_SECTORS) {
      expect(universe.map(e => e.symbol)).not.toContain(symbol)
    }
  })

  it('contains the 11 SPDR sector ETFs with XLRE as Real Estate', () => {
    const universe = getSectorsUniverse()
    const symbols = universe.map(e => e.symbol)
    for (const symbol of EXPECTED_SECTOR_SYMBOLS) {
      expect(symbols).toContain(symbol)
    }
  })

  it('does not use VNQ as the sector canonical Real Estate ETF', () => {
    expect(getSectorsUniverse().map(e => e.symbol)).not.toContain('VNQ')
  })

  it('has 11 entries', () => {
    expect(getSectorsUniverse()).toHaveLength(11)
  })

  it('every entry has rankScope="sectors"', () => {
    for (const entry of getSectorsUniverse()) {
      expect(entry.rankScope).toBe('sectors')
    }
  })

  it('every entry has groupType="sector"', () => {
    for (const entry of getSectorsUniverse()) {
      expect(entry.groupType).toBe('sector')
    }
  })

  it('every entry has a non-empty name', () => {
    for (const entry of getSectorsUniverse()) {
      expect(entry.name.length).toBeGreaterThan(0)
    }
  })

  it('every entry has a non-null sectorName', () => {
    for (const entry of getSectorsUniverse()) {
      expect(entry.sectorName).not.toBeNull()
    }
  })

  it('has no duplicate symbols', () => {
    const symbols = getSectorsUniverse().map(e => e.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })
})

// ─── Indexes ────────────────────────────────────────────────────

describe('getIndexesUniverse', () => {
  it('contains all 8 benchmark index ETFs', () => {
    const universe = getIndexesUniverse()
    const symbols = universe.map(e => e.symbol)
    for (const symbol of EXPECTED_INDEX_SYMBOLS) {
      expect(symbols).toContain(symbol)
    }
  })

  it('has 8 entries', () => {
    expect(getIndexesUniverse()).toHaveLength(8)
  })

  it('every entry has rankScope="indexes"', () => {
    for (const entry of getIndexesUniverse()) {
      expect(entry.rankScope).toBe('indexes')
    }
  })

  it('every entry has groupType="index"', () => {
    for (const entry of getIndexesUniverse()) {
      expect(entry.groupType).toBe('index')
    }
  })

  it('every entry has a non-empty name', () => {
    for (const entry of getIndexesUniverse()) {
      expect(entry.name.length).toBeGreaterThan(0)
    }
  })

  it('has no duplicate symbols', () => {
    const symbols = getIndexesUniverse().map(e => e.symbol)
    expect(new Set(symbols).size).toBe(symbols.length)
  })
})

// ─── Core (V1 === indexes) ─────────────────────────────────────

describe('getCoreUniverse', () => {
  it('has the same symbols as getIndexesUniverse (V1)', () => {
    const coreSymbols = getCoreUniverse().map(e => e.symbol)
    const indexSymbols = getIndexesUniverse().map(e => e.symbol)
    expect(coreSymbols).toEqual(indexSymbols)
  })

  it('every entry has rankScope="core"', () => {
    for (const entry of getCoreUniverse()) {
      expect(entry.rankScope).toBe('core')
    }
  })

  it('every entry has groupType="core"', () => {
    for (const entry of getCoreUniverse()) {
      expect(entry.groupType).toBe('core')
    }
  })
})

// ─── getUniverseForScope ───────────────────────────────────────

describe('getUniverseForScope', () => {
  it('returns sectors universe for "sectors"', () => {
    expect(getUniverseForScope('sectors')).toEqual(getSectorsUniverse())
  })

  it('returns indexes universe for "indexes"', () => {
    expect(getUniverseForScope('indexes')).toEqual(getIndexesUniverse())
  })

  it('returns core universe for "core"', () => {
    expect(getUniverseForScope('core')).toEqual(getCoreUniverse())
  })
})

// ─── getAllSymbols ──────────────────────────────────────────────

describe('getAllSymbols', () => {
  it('contains all unique symbols across all scopes', () => {
    const all = getAllSymbols()
    const symbols = all.map(e => e.symbol)

    // Sectors symbols
    for (const symbol of EXPECTED_SECTOR_SYMBOLS) {
      expect(symbols).toContain(symbol)
    }

    // Indexes symbols (includes SPY, RSP which are NOT in sectors)
    for (const symbol of EXPECTED_INDEX_SYMBOLS) {
      expect(symbols).toContain(symbol)
    }
  })

  it('lists each symbol only once even if it appears in multiple scopes', () => {
    const all = getAllSymbols()
    const symbols = all.map(e => e.symbol)
    // SPY and RSP appear in indexes but not sectors; still should be unique
    expect(new Set(symbols).size).toBe(symbols.length)
  })

  it('returns the correct total count (11 sectors + 8 indexes - 0 overlap = 19)', () => {
    const all = getAllSymbols()
    // sectors (11) + indexes (8) = 19, no overlap since sectors excludes SPY/RSP
    expect(all).toHaveLength(19)
  })
})
