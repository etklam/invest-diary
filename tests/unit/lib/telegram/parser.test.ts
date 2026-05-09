import { describe, it, expect } from 'vitest'
import { parseOneLiner } from '~/lib/telegram/parser'

describe('parseOneLiner', () => {
  // ─── /buy ────────────────────────────────────────────────────────────────

  describe('/buy', () => {
    it('parses standard format: /buy 5 2330@600', () => {
      const result = parseOneLiner('/buy 5 2330@600')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      if (result && result.command === 'buy') {
        expect(result.quantity).toBe(5)
        expect(result.symbol).toBe('2330')
        expect(result.price).toBe(600)
      }
    })

    it('parses decimal quantity and price: /buy 5.5 2330@600.5', () => {
      const result = parseOneLiner('/buy 5.5 2330@600.5')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      if (result && result.command === 'buy') {
        expect(result.quantity).toBe(5.5)
        expect(result.price).toBe(600.5)
      }
    })

    it('parses US stock: /sell 3 AAPL@150.25', () => {
      const result = parseOneLiner('/sell 3 AAPL@150.25')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('sell')
      if (result && result.command === 'sell') {
        expect(result.quantity).toBe(3)
        expect(result.symbol).toBe('AAPL')
        expect(result.price).toBe(150.25)
      }
    })

    it('tolerates extra whitespace: /buy   5   2330@600', () => {
      const result = parseOneLiner('/buy   5   2330@600')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      if (result && result.command === 'buy') {
        expect(result.quantity).toBe(5)
        expect(result.symbol).toBe('2330')
        expect(result.price).toBe(600)
      }
    })

    it('parses symbol with dot: /buy 1 BRK.B@400', () => {
      const result = parseOneLiner('/buy 1 BRK.B@400')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      if (result && result.command === 'buy') {
        expect(result.symbol).toBe('BRK.B')
      }
    })

    it('parses numeric-only ticker: /buy 1 0050@150', () => {
      const result = parseOneLiner('/buy 1 0050@150')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      if (result && result.command === 'buy') {
        expect(result.symbol).toBe('0050')
      }
    })

    it('uppercases symbol: /buy 5 aapl@150', () => {
      const result = parseOneLiner('/buy 5 aapl@150')
      if (result && result.command === 'buy') {
        expect(result.symbol).toBe('AAPL')
      }
    })
  })

  // ─── /note ───────────────────────────────────────────────────────────────

  describe('/note', () => {
    it('parses simple content: /note 今天大盤回調', () => {
      const result = parseOneLiner('/note 今天大盤回調')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('note')
      if (result && result.command === 'note') {
        expect(result.content).toBe('今天大盤回調')
      }
    })

    it('parses English content: /note Market is down today', () => {
      const result = parseOneLiner('/note Market is down today')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('note')
      if (result && result.command === 'note') {
        expect(result.content).toBe('Market is down today')
      }
    })
  })

  // ─── null returns (triggers conversation) ─────────────────────────────────

  describe('null returns (fallback to conversation)', () => {
    it('returns null for bare /buy', () => {
      expect(parseOneLiner('/buy')).toBeNull()
    })

    it('returns null for /buy with only quantity: /buy 5', () => {
      expect(parseOneLiner('/buy 5')).toBeNull()
    })

    it('returns null for /buy missing @price: /buy 5 2330', () => {
      expect(parseOneLiner('/buy 5 2330')).toBeNull()
    })

    it('returns null for non-numeric quantity: /buy abc 2330@600', () => {
      expect(parseOneLiner('/buy abc 2330@600')).toBeNull()
    })

    it('returns null for bare /sell', () => {
      expect(parseOneLiner('/sell')).toBeNull()
    })

    it('returns null for bare /note', () => {
      expect(parseOneLiner('/note')).toBeNull()
    })

    it('returns null for empty /note: /note   ', () => {
      expect(parseOneLiner('/note   ')).toBeNull()
    })

    it('returns null for unknown command: /unknown', () => {
      expect(parseOneLiner('/unknown')).toBeNull()
    })

    it('returns null for random text without command', () => {
      expect(parseOneLiner('hello world')).toBeNull()
    })
  })
})
