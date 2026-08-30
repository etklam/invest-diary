import { describe, expect, it } from 'vitest'
import { mockGetRouterParam } from '../../vi-setup'
import { normalizeStockSymbol, parseSymbolParam, symbolSchema } from '~/lib/stocks/symbols'

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

describe('parseSymbolParam', () => {
  it('prefers params, then router param, then the final path segment', () => {
    mockGetRouterParam.mockReturnValue('router-symbol')
    expect(parseSymbolParam({ context: { params: { symbol: 'param-symbol' } }, path: '/api/stocks/path-symbol' } as any)).toBe('param-symbol')

    expect(parseSymbolParam({ context: { params: {} }, path: '/api/stocks/path-symbol' } as any)).toBe('router-symbol')

    mockGetRouterParam.mockReturnValue(undefined)
    expect(parseSymbolParam({ context: { params: {} }, path: '/api/stocks/path%2Dsymbol' } as any)).toBe('path-symbol')
  })

  it('decodes encoded symbols and preserves malformed encoding for validation', () => {
    expect(parseSymbolParam({ context: { params: { symbol: 'BRK%2EB' } } } as any)).toBe('BRK.B')
    expect(parseSymbolParam({ context: { params: { symbol: '%' } } } as any)).toBe('%')
  })
})

describe('symbolSchema', () => {
  it('retains the stock symbol regex semantics', () => {
    expect(symbolSchema.safeParse('2330.TW').success).toBe(true)
    expect(symbolSchema.safeParse('AAPL-INVALID').success).toBe(false)
    expect(symbolSchema.safeParse('12345678901').success).toBe(false)
  })
})
