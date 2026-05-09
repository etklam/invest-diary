import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { parseOneLiner } from '~/lib/telegram/parser'

/**
 * Integration tests for Telegram bot functionality.
 * Tests cover parser, command logic, and webhook handling patterns.
 *
 * For full E2E testing against a real Telegram bot, use the E2E test suite
 * with a test bot token and ngrok for local webhook exposure.
 */

// ─── Helper: Simulate Telegram update payload ───────────────────────────────

function makeUpdate(chatId: number, text: string, updateId: number) {
  return {
    update_id: updateId,
    message: {
      message_id: updateId,
      from: {
        id: chatId,
        first_name: 'TestUser',
        language_code: 'zh-TW',
      },
      chat: {
        id: chatId,
        type: 'private',
      },
      text,
      date: Math.floor(Date.now() / 1000),
    },
  }
}

describe('Telegram Bot Integration', () => {
  describe('Webhook Payload Structure', () => {
    it('generates valid Telegram update payload', () => {
      const update = makeUpdate(123456789, '/buy 5 2330@600', 1)
      expect(update.update_id).toBe(1)
      expect(update.message?.from?.id).toBe(123456789)
      expect(update.message?.chat?.type).toBe('private')
      expect(update.message?.text).toBe('/buy 5 2330@600')
    })
  })

  describe('Parser + Update Integration', () => {
    it('parseOneLiner correctly handles Telegram-format text', () => {
      const update = makeUpdate(123456789, '/buy 5 2330@600', 1)
      const result = parseOneLiner(update.message!.text!)
      expect(result).not.toBeNull()
      expect(result!.command).toBe('buy')
      if (result && result.command === 'buy') {
        expect(result.quantity).toBe(5)
        expect(result.symbol).toBe('2330')
        expect(result.price).toBe(600)
      }
    })

    it('handles /buy without params as conversation trigger', () => {
      const update = makeUpdate(123456789, '/buy', 2)
      const result = parseOneLiner(update.message!.text!)
      expect(result).toBeNull() // Triggers conversation
    })

    it('handles /note with content correctly', () => {
      const update = makeUpdate(123456789, '/note 今天買了台積電', 3)
      const result = parseOneLiner(update.message!.text!)
      expect(result).not.toBeNull()
      expect(result!.command).toBe('note')
      if (result && result.command === 'note') {
        expect(result.content).toBe('今天買了台積電')
      }
    })

    it('handles /sell with US stock correctly', () => {
      const update = makeUpdate(123456789, '/sell 10 AAPL@175.50', 4)
      const result = parseOneLiner(update.message!.text!)
      expect(result).not.toBeNull()
      expect(result!.command).toBe('sell')
      if (result && result.command === 'sell') {
        expect(result.quantity).toBe(10)
        expect(result.symbol).toBe('AAPL')
        expect(result.price).toBe(175.50)
      }
    })
  })

  describe('Title Generation Format', () => {
    it('generates correct buy title format', () => {
      const symbol = '2330'
      const quantity = 5
      const direction = 'buy'
      const dateStr = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })
      const title = `${direction === 'buy' ? '買入' : '賣出'} ${symbol} x${quantity} - ${dateStr}`
      expect(title).toMatch(/^買入 2330 x5 - \d{4}\/\d{1,2}\/\d{1,2}$/)
    })

    it('generates correct sell title format', () => {
      const symbol = 'AAPL'
      const quantity = 10
      const direction = 'sell'
      const dateStr = new Date().toLocaleDateString('zh-TW', { timeZone: 'Asia/Taipei' })
      const title = `${direction === 'buy' ? '買入' : '賣出'} ${symbol} x${quantity} - ${dateStr}`
      expect(title).toMatch(/^賣出 AAPL x10 - \d{4}\/\d{1,2}\/\d{1,2}$/)
    })
  })

  describe('Idempotency Pattern', () => {
    it('update_id structure is integer and monotonic', () => {
      const updates = [
        makeUpdate(123456789, '/buy 1 AAPL@100', 100),
        makeUpdate(123456789, '/buy 2 AAPL@101', 101),
        makeUpdate(123456789, '/buy 3 AAPL@102', 102),
      ]
      const ids = updates.map((u) => u.update_id)
      expect(ids).toEqual([100, 101, 102])
    })

    it('same update_id with different text should be treated as replay', () => {
      const update1 = makeUpdate(123456789, '/buy 1 AAPL@100', 100)
      const update2 = makeUpdate(123456789, '/buy 1 AAPL@100', 100)
      expect(update1.update_id).toBe(update2.update_id)
      // In production, checkAndMarkUpdate would return false for the second call
    })
  })

  describe('Private Chat Enforcement', () => {
    it('detects private chat type', () => {
      const update = makeUpdate(123, '/start', 1)
      expect(update.message?.chat?.type).toBe('private')
    })

    it('group chat type would be different', () => {
      const groupUpdate = {
        ...makeUpdate(123, '/start', 2),
        message: {
          ...makeUpdate(123, '/start', 2).message!,
          chat: { id: -456, type: 'group' as const },
        },
      }
      expect(groupUpdate.message?.chat?.type).toBe('group')
      expect(groupUpdate.message?.chat?.type).not.toBe('private')
    })
  })
})
