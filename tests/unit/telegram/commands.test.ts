import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  startCommand,
  helpCommand,
  loginCommand,
  languageCommand,
  buyCommand,
  sellCommand,
  noteCommand,
  cancelCommand,
  handleMessage,
} from '~/lib/telegram/commands'
import { parseOneLiner } from '~/lib/telegram/parser'

// Mock server utils (DB access)
vi.mock('~/server/utils/telegram-db', () => ({
  findTelegramAccount: vi.fn(),
  createTelegramAccount: vi.fn(),
  updateTelegramLanguage: vi.fn(),
  verifyAndConsumeCode: vi.fn(),
  touchTelegramAccount: vi.fn(),
  sessionWrite: vi.fn(),
  sessionRead: vi.fn(),
}))

// Mock diary-write
vi.mock('~/server/utils/diary-write', () => ({
  createDiaryForUser: vi.fn(),
}))

// Mock prisma
vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: vi.fn(),
    },
  },
}))

// Grab mocked functions for assertions
import {
  findTelegramAccount,
  verifyAndConsumeCode,
  createTelegramAccount,
  touchTelegramAccount,
  updateTelegramLanguage,
  sessionRead,
  sessionWrite,
} from '~/server/utils/telegram-db'

// ─── Helper: make a mock grammY context ──────────────────────────────────

function makeCtx(overrides: Record<string, unknown> = {}) {
  return {
    from: {
      id: 123456,
      first_name: 'TestUser',
      username: 'test_user',
      language_code: 'zh-TW',
      ...(overrides.from as Record<string, unknown> || {}),
    },
    chat: {
      type: 'private',
      ...(overrides.chat as Record<string, unknown> || {}),
    },
    message: {
      text: '/start',
      ...(overrides.message as Record<string, unknown> || {}),
    },
    reply: vi.fn().mockResolvedValue(undefined),
    t: vi.fn((key: string, _params?: Record<string, unknown>) => {
      // Simple i18n stub: return the key for assertion readability
      if (_params) {
        return `${key} ${JSON.stringify(_params)}`
      }
      return key
    }),
    conversation: {
      enter: vi.fn().mockResolvedValue(undefined),
      exit: vi.fn().mockResolvedValue(undefined),
    },
    i18n: {
      setLocale: vi.fn().mockResolvedValue(undefined),
    },
    ...overrides,
  }
}

// ─── Tests ──────────────────────────────────────────────────────────────

describe('Telegram Command Handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── /start ────────────────────────────────────────────────────────

  describe('startCommand', () => {
    it('replies with welcome for linked users', async () => {
      const mockAccount = { userId: BigInt(1), telegramId: BigInt(123456) }
      vi.mocked(findTelegramAccount).mockResolvedValue(mockAccount as any)

      const ctx = makeCtx()
      await startCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.start.welcome')
    })

    it('replies with notLinked for unlinked users', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)

      const ctx = makeCtx()
      await startCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.start.notLinked')
    })

    it('skips reply for non-private chats (no crash)', async () => {
      const ctx = makeCtx({ chat: { type: 'group' } })
      await startCommand(ctx)
      // privateOnly returns false, reply should not be called
      expect(ctx.reply).not.toHaveBeenCalled()
    })
  })

  // ─── /help ─────────────────────────────────────────────────────────

  describe('helpCommand', () => {
    it('replies with help message', async () => {
      const ctx = makeCtx()
      await helpCommand(ctx)
      expect(ctx.reply).toHaveBeenCalledWith('telegram.help')
    })

    it('skips reply for non-private chats', async () => {
      const ctx = makeCtx({ chat: { type: 'group' } })
      await helpCommand(ctx)
      expect(ctx.reply).not.toHaveBeenCalled()
    })
  })

  // ─── /login ────────────────────────────────────────────────────────

  describe('loginCommand', () => {
    it('replies with alreadyLinked when account exists', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue({ userId: BigInt(1) } as any)

      const ctx = makeCtx({ message: { text: '/login ABC123' } })
      await loginCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.login.alreadyLinked')
    })

    it('replies with usage when no code provided', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)

      const ctx = makeCtx({ message: { text: '/login' } })
      await loginCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.login.usage')
    })

    it('replies with usage when code is not 6 characters', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)

      const ctx = makeCtx({ message: { text: '/login ABC' } })
      await loginCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.login.usage')
    })

    it('replies with invalidCode when verification fails', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)
      vi.mocked(verifyAndConsumeCode).mockResolvedValue({
        success: false,
        userId: null,
        tooManyAttempts: false,
      })

      const ctx = makeCtx({ message: { text: '/login ABC123' } })
      await loginCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.login.invalidCode')
    })

    it('replies with tooManyCodeAttempts when attempts exceeded', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)
      vi.mocked(verifyAndConsumeCode).mockResolvedValue({
        success: false,
        userId: null,
        tooManyAttempts: true,
      })

      const ctx = makeCtx({ message: { text: '/login ABC123' } })
      await loginCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.errors.tooManyCodeAttempts')
    })

    it('creates account on successful verification', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)
      vi.mocked(verifyAndConsumeCode).mockResolvedValue({
        success: true,
        userId: BigInt(42),
        tooManyAttempts: false,
      })
      vi.mocked(createTelegramAccount).mockResolvedValue(undefined)

      const ctx = makeCtx({
        from: {
          id: 123456,
          username: 'testuser',
          first_name: 'Test',
          last_name: 'User',
          language_code: 'zh-TW',
        },
        message: { text: '/login ABC123' },
      })
      await loginCommand(ctx)

      expect(createTelegramAccount).toHaveBeenCalledWith({
        telegramId: 123456,
        userId: BigInt(42),
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        language: 'zh-TW',
      })
      expect(ctx.reply).toHaveBeenCalledWith('telegram.login.success')
    })

    it('uses zh-TW as default language for non-Chinese users', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)
      vi.mocked(verifyAndConsumeCode).mockResolvedValue({
        success: true,
        userId: BigInt(42),
        tooManyAttempts: false,
      })
      vi.mocked(createTelegramAccount).mockResolvedValue(undefined)

      const ctx = makeCtx({
        from: {
          id: 123456,
          language_code: 'en',
        },
        message: { text: '/login ABC123' },
      })
      await loginCommand(ctx)

      expect(createTelegramAccount).toHaveBeenCalledWith(
        expect.objectContaining({ language: 'zh-TW' })
      )
    })
  })

  // ─── /language ──────────────────────────────────────────────────────

  describe('languageCommand', () => {
    it('replies with unsupported for invalid language', async () => {
      const ctx = makeCtx({ message: { text: '/language ja' } })
      await languageCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.language.unsupported')
    })

    it('replies with unsupported when no language specified', async () => {
      const ctx = makeCtx({ message: { text: '/language' } })
      await languageCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.language.unsupported')
    })

    it('updates language for linked account', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue({ userId: BigInt(1) } as any)

      const ctx = makeCtx({ message: { text: '/language en' } })
      await languageCommand(ctx)

      expect(updateTelegramLanguage).toHaveBeenCalledWith(123456, 'en')
      expect(ctx.reply).toHaveBeenCalledWith(expect.stringContaining('telegram.language.set'))
    })

    it('stores language in session for unlinked user', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)
      vi.mocked(sessionRead).mockResolvedValue(null)

      const ctx = makeCtx({ message: { text: '/language zh-TW' } })
      await languageCommand(ctx)

      expect(sessionWrite).toHaveBeenCalledWith('user:123456', { language: 'zh-TW' })
    })

    it('normalizes zh-tw to zh-TW', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)
      vi.mocked(sessionRead).mockResolvedValue(null)

      const ctx = makeCtx({ message: { text: '/language zh-tw' } })
      await languageCommand(ctx)

      expect(sessionWrite).toHaveBeenCalledWith('user:123456', { language: 'zh-TW' })
    })
  })

  // ─── /buy ──────────────────────────────────────────────────────────

  describe('buyCommand', () => {
    it('requires linked account', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)

      const ctx = makeCtx({ message: { text: '/buy' } })
      await buyCommand(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.errors.notLinked')
    })

    it('enters conversation for /buy without params', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue({ userId: BigInt(1) } as any)

      const ctx = makeCtx({ message: { text: '/buy' } })
      await buyCommand(ctx)

      expect(ctx.conversation.enter).toHaveBeenCalledWith('buy')
    })

    it('enters conversation when parseOneLiner returns null', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue({ userId: BigInt(1) } as any)

      // parseOneLiner('/buy 5') returns null -> conversation
      const ctx = makeCtx({ message: { text: '/buy 5' } })
      await buyCommand(ctx)

      expect(ctx.conversation.enter).toHaveBeenCalledWith('buy')
    })
  })

  // ─── /cancel ───────────────────────────────────────────────────────

  describe('cancelCommand', () => {
    it('exits conversation and replies', async () => {
      const ctx = makeCtx()
      await cancelCommand(ctx)

      expect(ctx.conversation.exit).toHaveBeenCalled()
      expect(ctx.reply).toHaveBeenCalledWith('telegram.cancel')
    })

    it('handles no active conversation gracefully', async () => {
      const ctx = makeCtx({
        conversation: {
          exit: vi.fn().mockRejectedValue(new Error('no conversation')),
        },
      })
      await cancelCommand(ctx)

      // Should not throw, should reply with cancel
      expect(ctx.reply).toHaveBeenCalledWith('telegram.cancel')
    })
  })

  // ─── handleMessage (fallback) ──────────────────────────────────────

  describe('handleMessage', () => {
    it('ignores commands (starts with /)', async () => {
      const ctx = makeCtx({ message: { text: '/start' } })
      await handleMessage(ctx)
      expect(ctx.reply).not.toHaveBeenCalled()
    })

    it('replies with notLinked for unlinked users', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue(null)

      const ctx = makeCtx({ message: { text: 'hello' } })
      await handleMessage(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.errors.notLinked')
    })

    it('replies with noReply for linked users', async () => {
      vi.mocked(findTelegramAccount).mockResolvedValue({ userId: BigInt(1) } as any)

      const ctx = makeCtx({ message: { text: 'hello' } })
      await handleMessage(ctx)

      expect(ctx.reply).toHaveBeenCalledWith('telegram.generic.noReply')
    })

    it('ignores non-text messages', async () => {
      const ctx = makeCtx({
        message: { photo: 'some_photo' },
      })
      // Cast to avoid TS strictness in test
      await handleMessage(ctx)

      expect(ctx.reply).not.toHaveBeenCalled()
    })

    it('ignores empty messages', async () => {
      const ctx = makeCtx({ message: { text: '' } })
      await handleMessage(ctx)

      expect(ctx.reply).not.toHaveBeenCalled()
    })
  })
})
