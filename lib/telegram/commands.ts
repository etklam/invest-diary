import type { ParseResult } from '~/types/telegram'
import { parseOneLiner } from './parser'
import { createBuySellDiary, createNoteDiary } from './diary-write'
import {
  findTelegramAccount,
  createTelegramAccount,
  updateTelegramLanguage,
  verifyAndConsumeCode,
  touchTelegramAccount,
  sessionWrite,
  sessionRead,
} from '~/server/utils/telegram-db'
import { logger } from '~/lib/logger'

const log = logger.telegram

// Pragmatic type: grammY's generics for i18n plugins are overly complex.
// The `.t()` method is added at runtime by @grammyjs/i18n.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = any

// ─── Middleware: Require linked account ──────────────────────────────────────

async function requireLinked(ctx: Ctx): Promise<bigint | null> {
  if (!ctx.from) {
    await ctx.reply('無法辨識使用者')
    return null
  }
  const account = await findTelegramAccount(ctx.from.id)
  if (!account) {
    await ctx.reply(ctx.t('telegram.errors.notLinked'))
    return null
  }
  await touchTelegramAccount(ctx.from.id)
  return account.userId
}

// ─── Private chat only guard ────────────────────────────────────────────────

function isPrivateChat(ctx: Ctx): boolean {
  return ctx.chat?.type === 'private'
}

async function privateOnly(ctx: Ctx): Promise<boolean> {
  if (!isPrivateChat(ctx)) {
    return false
  }
  return true
}

// ─── /start ─────────────────────────────────────────────────────────────────

export async function startCommand(ctx: Ctx) {
  if (!await privateOnly(ctx)) return
  const account = ctx.from ? await findTelegramAccount(ctx.from.id) : null
  if (account) {
    await ctx.reply(
      ctx.t('telegram.start.welcome')
    )
  } else {
    await ctx.reply(
      ctx.t('telegram.start.notLinked')
    )
  }
}

// ─── /help ──────────────────────────────────────────────────────────────────

export async function helpCommand(ctx: Ctx) {
  if (!await privateOnly(ctx)) return
  await ctx.reply(ctx.t('telegram.help'))
}

// ─── /login ─────────────────────────────────────────────────────────────────

export async function loginCommand(ctx: Ctx) {
  if (!await privateOnly(ctx)) return
  if (!ctx.from) return

  // Check already linked
  const existing = await findTelegramAccount(ctx.from.id)
  if (existing) {
    await ctx.reply(ctx.t('telegram.login.alreadyLinked'))
    return
  }

  // Extract code from message text
  const msgText = ctx.message?.text ?? ''
  const code = msgText.replace(/^\/login\s*/, '').trim()
  if (!code || code.length !== 6) {
    await ctx.reply(ctx.t('telegram.login.usage'))
    return
  }

  const result = await verifyAndConsumeCode(code)
  if (!result.success) {
    if (result.tooManyAttempts) {
      await ctx.reply(ctx.t('telegram.errors.tooManyCodeAttempts'))
    } else {
      await ctx.reply(ctx.t('telegram.login.invalidCode'))
    }
    return
  }

  await createTelegramAccount({
    telegramId: ctx.from.id,
    userId: result.userId!,
    username: ctx.from.username ?? null,
    firstName: ctx.from.first_name ?? null,
    lastName: ctx.from.last_name ?? null,
    language: ctx.from.language_code?.startsWith('zh') ? ctx.from.language_code : 'zh-TW',
  })

  await ctx.reply(ctx.t('telegram.login.success'))
}

// ─── /language ──────────────────────────────────────────────────────────────

export async function languageCommand(ctx: Ctx) {
  if (!await privateOnly(ctx)) return
  if (!ctx.from) return

  const msgText = ctx.message?.text ?? ''
  const lang = msgText.replace(/^\/language\s*/, '').trim().toLowerCase()
  const supported = ['zh-tw', 'zh-cn', 'en']

  if (!lang || !supported.includes(lang)) {
    await ctx.reply(ctx.t('telegram.language.unsupported'))
    return
  }

  const normalized = lang === 'zh-tw' ? 'zh-TW' : lang === 'zh-cn' ? 'zh-CN' : 'en'

  // Persist to account if linked, otherwise store in session
  const account = await findTelegramAccount(ctx.from.id)
  if (account) {
    await updateTelegramLanguage(ctx.from.id, normalized)
  } else {
    // Store language preference in session for unlinked users
    const key = `user:${ctx.from.id}`
    const session = await sessionRead(key)
    await sessionWrite(key, { ...(session ?? {}), language: normalized })
  }

  // Update i18n locale at runtime so the response uses the new language
  try {
    await ctx.i18n.setLocale(normalized)
  } catch (err) {
    log.warn('Failed to set i18n locale', { locale: normalized, error: String(err) })
  }

  await ctx.reply(ctx.t('telegram.language.set', { language: normalized }))
}

// ─── /buy (one-liner + conversation starter) ────────────────────────────────

export async function buyCommand(ctx: Ctx) {
  if (!await privateOnly(ctx)) return
  const userId = await requireLinked(ctx)
  if (!userId) return

  // Strip the /buy command prefix to get the raw text
  const rawText = ctx.message?.text ?? ''
  const parsed = parseOneLiner(rawText)

  if (parsed && parsed.command === 'buy') {
    await handleBuySellOneLiner(ctx, parsed, userId)
  } else {
    // Start conversation
    await ctx.conversation.enter('buy')
  }
}

// ─── /sell ──────────────────────────────────────────────────────────────────

export async function sellCommand(ctx: Ctx) {
  if (!await privateOnly(ctx)) return
  const userId = await requireLinked(ctx)
  if (!userId) return

  const rawText = ctx.message?.text ?? ''
  const parsed = parseOneLiner(rawText)

  if (parsed && parsed.command === 'sell') {
    await handleBuySellOneLiner(ctx, parsed, userId)
  } else {
    await ctx.conversation.enter('sell')
  }
}

// ─── /note ──────────────────────────────────────────────────────────────────

export async function noteCommand(ctx: Ctx) {
  if (!await privateOnly(ctx)) return
  const userId = await requireLinked(ctx)
  if (!userId) return

  const rawText = ctx.message?.text ?? ''
  const parsed = parseOneLiner(rawText)

  if (parsed && parsed.command === 'note') {
    await handleNoteOneLiner(ctx, parsed, userId)
  } else {
    await ctx.conversation.enter('note')
  }
}

// ─── /cancel ────────────────────────────────────────────────────────────────

export async function cancelCommand(ctx: Ctx) {
  if (!await privateOnly(ctx)) return
  // Exit any active conversation via the grammY conversations plugin
  try {
    await ctx.conversation.exit()
  } catch {
    // No active conversation — this is fine
  }
  await ctx.reply(ctx.t('telegram.cancel'))
}

// ─── One-liner handlers ────────────────────────────────────────────────────

async function handleBuySellOneLiner(
  ctx: Ctx,
  result: ParseResult & { command: 'buy' | 'sell' },
  userId: bigint
) {
  await createBuySellDiary(
    ctx,
    userId,
    result.symbol,
    result.quantity,
    result.price,
    result.command === 'buy' ? 'BUY' : 'SELL'
  )
}

async function handleNoteOneLiner(
  ctx: Ctx,
  result: ParseResult & { command: 'note' },
  userId: bigint
) {
  await createNoteDiary(ctx, userId, result.content)
}

// ─── Bot message handler (for conversation steps) ───────────────────────────

export async function handleMessage(ctx: Ctx) {
  if (!isPrivateChat(ctx)) return
  if (!ctx.message || !('text' in ctx.message) || !ctx.message.text) return
  const text = ctx.message.text.trim()

  // Ignore commands (handled separately)
  if (text.startsWith('/')) return

  // For unlinked users, guide them to link first
  const account = ctx.from ? await findTelegramAccount(ctx.from.id) : null
  if (!account) {
    await ctx.reply(ctx.t('telegram.errors.notLinked'))
    return
  }

  // For V1, messages without command prefix are treated as potential conversation
  // continuations. The grammY conversations plugin handles the state machine.
  // This handler is a fallback for messages outside conversations.
  await ctx.reply(ctx.t('telegram.generic.noReply'))
}
