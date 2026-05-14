import { Bot, session } from 'grammy'
import { conversations } from '@grammyjs/conversations'
import { I18n } from '@grammyjs/i18n'
import { createPrismaSessionAdapter } from './session'
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
} from './commands'
import {
  createBuyConversation,
  createSellConversation,
  createNoteConversation,
} from './conversations'

/**
 * Create and configure a grammY Bot instance.
 * Called per-request in webhook mode (Nitro serverless).
 *
 * Uses pragmatic typing: grammY's generics for plugins (session, i18n) are
 * complex and their strict types conflict when combined. For a single-user
 * personal project, runtime behavior is what matters.
 */

export function createBot(token: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const bot = new Bot<any>(token)

  // ─── i18n Plugin ─────────────────────────────────────────────────────
  const i18n = new I18n({
    defaultLocale: 'zh-TW',
    directory: 'i18n/locales',
    useSession: true,
  })
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  bot.use(i18n as any)

  // ─── Session Plugin ─────────────────────────────────────────────────
  const adapter = createPrismaSessionAdapter()

  bot.use(session({
    initial() {
      return { step: 'idle', data: {} }
    },
    storage: {
      async read(key: string) {
        return (await adapter.read(key)) ?? undefined
      },
      async write(key: string, value: Record<string, unknown>) {
        await adapter.write(key, value as { step: string; data: Record<string, unknown> })
      },
      async delete(key: string) {
        await adapter.delete(key)
      },
    },
  }))

  // ─── Conversations Plugin ──────────────────────────────────────────────
  bot.use(conversations())
  bot.use(createBuyConversation())
  bot.use(createSellConversation())
  bot.use(createNoteConversation())

  // ─── Commands ───────────────────────────────────────────────────────
  bot.command('start', startCommand)
  bot.command('help', helpCommand)
  bot.command('login', loginCommand)
  bot.command('language', languageCommand)
  bot.command('buy', buyCommand)
  bot.command('sell', sellCommand)
  bot.command('note', noteCommand)
  bot.command('cancel', cancelCommand)

  // ─── Fallback ───────────────────────────────────────────────────────
  bot.on('message:text', handleMessage)

  return bot
}
