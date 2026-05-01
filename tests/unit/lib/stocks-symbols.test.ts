import { describe, expect, it } from 'vitest'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'

describe('normalizeStockSymbol', () => {
  it('uppercases and trims symbols', () => {
    expect(normalizeStockSymbol(' aapl ')).toBe('AAPL')
  })

  it('preserves TW suffix casing', () => {
    expect(normalizeStockSymbol(' 2330.tw ')).toBe('2330.TW')
  })

  it('collapses internal whitespace instead of silently joining words', () => {
    expect(normalizeStockSymbol('brk   b')).toBe('BRK B')
  })
})
