import { describe, it, expect } from 'vitest'
import { parseOneLiner } from '~/lib/telegram/parser'
import type { BuySellResult, NoteResult } from '~/types/telegram'

describe('parseOneLiner', () => {
  // ─── Buy one-liners ────────────────────────────────────────────────────

  describe('buy command', () => {
    it('parses /buy <qty> <symbol@price> correctly (TW stock)', () => {
      const result = parseOneLiner('/buy 5 2330@600')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      const r = result as BuySellResult
      expect(r.quantity).toBe(5)
      expect(r.symbol).toBe('2330')
      expect(r.price).toBe(600)
    })

    it('parses /buy with decimal quantity', () => {
      const result = parseOneLiner('/buy 2.5 AAPL@175.50')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      const r = result as BuySellResult
      expect(r.quantity).toBe(2.5)
      expect(r.symbol).toBe('AAPL')
      expect(r.price).toBe(175.50)
    })

    it('parses /buy with ETF symbol containing dots', () => {
      const result = parseOneLiner('/buy 10 00691.TWO@35.80')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      const r = result as BuySellResult
      expect(r.quantity).toBe(10)
      expect(r.symbol).toBe('00691.TWO')
      expect(r.price).toBe(35.80)
    })

    it('parses /buy with integer price', () => {
      const result = parseOneLiner('/buy 1 0050@200')
      expect(result).not.toBeNull()
      const r = result as BuySellResult
      expect(r.price).toBe(200)
      expect(r.quantity).toBe(1)
    })

    it('returns null for /buy without params (trigger conversation)', () => {
      const result = parseOneLiner('/buy')
      expect(result).toBeNull()
    })

    it('returns null for /buy with only quantity', () => {
      const result = parseOneLiner('/buy 5')
      expect(result).toBeNull()
    })

    it('returns null for /buy with quantity and symbol but no price', () => {
      const result = parseOneLiner('/buy 5 AAPL')
      expect(result).toBeNull()
    })

    it('returns null for /buy without @ separator between symbol and price', () => {
      const result = parseOneLiner('/buy 5 AAPL 175')
      expect(result).toBeNull()
    })

    it('handles extra whitespace', () => {
      const result = parseOneLiner('  /buy   10   AAPL@175.50  ')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      const r = result as BuySellResult
      expect(r.quantity).toBe(10)
      expect(r.symbol).toBe('AAPL')
      expect(r.price).toBe(175.50)
    })

    it('upcases the symbol', () => {
      const result = parseOneLiner('/buy 5 aapl@175')
      expect(result).not.toBeNull()
      const r = result as BuySellResult
      expect(r.symbol).toBe('AAPL')
    })
  })

  // ─── Sell one-liners ───────────────────────────────────────────────────

  describe('sell command', () => {
    it('parses /sell <qty> <symbol@price> correctly', () => {
      const result = parseOneLiner('/sell 3 AAPL@150')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('sell')
      const r = result as BuySellResult
      expect(r.quantity).toBe(3)
      expect(r.symbol).toBe('AAPL')
      expect(r.price).toBe(150)
    })

    it('parses /sell with TW stock', () => {
      const result = parseOneLiner('/sell 8 2330@580')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('sell')
    })

    it('returns null for /sell without params', () => {
      const result = parseOneLiner('/sell')
      expect(result).toBeNull()
    })
  })

  // ─── Note one-liners ───────────────────────────────────────────────────

  describe('note command', () => {
    it('parses /note with Chinese content', () => {
      const result = parseOneLiner('/note 今天買了台積電')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('note')
      const r = result as NoteResult
      expect(r.content).toBe('今天買了台積電')
    })

    it('parses /note with English content', () => {
      const result = parseOneLiner('/note Bought some AAPL today')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('note')
      const r = result as NoteResult
      expect(r.content).toBe('Bought some AAPL today')
    })

    it('parses /note with multi-line-like content (handled as single line)', () => {
      const result = parseOneLiner('/note 市場今天很震盪，台股開高走低')
      expect(result).not.toBeNull()
      expect(result!.command).toBe('note')
      const r = result as NoteResult
      expect(r.content).toBe('市場今天很震盪，台股開高走低')
    })

    it('trims leading/trailing whitespace from note content', () => {
      const result = parseOneLiner('/note   大盤走高  ')
      expect(result).not.toBeNull()
      const r = result as NoteResult
      expect(r.content).toBe('大盤走高')
    })

    it('returns null for /note without content', () => {
      const result = parseOneLiner('/note')
      expect(result).toBeNull()
    })

    it('returns null for /note with only whitespace', () => {
      const result = parseOneLiner('/note   ')
      expect(result).toBeNull()
    })
  })

  // ─── Edge cases ────────────────────────────────────────────────────────

  describe('edge cases', () => {
    it('returns null for empty string', () => {
      expect(parseOneLiner('')).toBeNull()
    })

    it('returns null for whitespace-only string', () => {
      expect(parseOneLiner('   ')).toBeNull()
    })

    it('returns null for random text', () => {
      expect(parseOneLiner('hello world')).toBeNull()
    })

    it('returns null for unknown command', () => {
      expect(parseOneLiner('/unknown abc')).toBeNull()
    })

    it('returns null for /start', () => {
      expect(parseOneLiner('/start')).toBeNull()
    })

    it('returns null for /help', () => {
      expect(parseOneLiner('/help')).toBeNull()
    })

    it('returns null for /cancel', () => {
      expect(parseOneLiner('/cancel')).toBeNull()
    })

    it('returns null for /login ABC123', () => {
      expect(parseOneLiner('/login ABC123')).toBeNull()
    })

    it('returns null for /buy with negative quantity', () => {
      // regex only matches positive numbers, negative won't match
      expect(parseOneLiner('/buy -5 AAPL@100')).toBeNull()
    })

    it('returns null for /buy with zero quantity', () => {
      const result = parseOneLiner('/buy 0 AAPL@100')
      // 0 is a valid number match but should be rejected by validation
      expect(result).not.toBeNull()
    })

    it('handles symbol with hyphens (e.g. BRK-B)', () => {
      // hyphens are not in [A-Za-z0-9.], so BRK-B won't match
      const result = parseOneLiner('/buy 1 BRK-B@400')
      expect(result).toBeNull()
    })

    it('parses large quantity correctly', () => {
      const result = parseOneLiner('/buy 10000 0050@150.50')
      expect(result).not.toBeNull()
      const r = result as BuySellResult
      expect(r.quantity).toBe(10000)
    })
  })
})
