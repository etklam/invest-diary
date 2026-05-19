import { createConversation } from '@grammyjs/conversations'
import { createBuySellDiary, createNoteDiary } from './diary-write'
import {
  findTelegramAccount,
  touchTelegramAccount,
} from '~/server/utils/telegram-db'

// Pragmatic type for grammY context with i18n + conversations plugins
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ctx = any

// ─── Require linked account (same logic as commands.ts) ─────────────────────

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

// ─── Buy Conversation ───────────────────────────────────────────────────────

export function createBuyConversation() {
  return createConversation(async (conversation, ctx: Ctx) => {
    const userId = await requireLinked(ctx)
    if (!userId) return

    await ctx.reply(ctx.t('telegram.buy.askQuantity'))
    const qtyCtx = await conversation.wait()
    if (!qtyCtx.message?.text) {
      await ctx.reply(ctx.t('telegram.cancel'))
      return
    }
    const qtyText = qtyCtx.message.text.trim()
    if (qtyText.startsWith('/cancel')) {
      await ctx.reply(ctx.t('telegram.cancel'))
      return
    }
    const quantity = parseFloat(qtyText)
    if (isNaN(quantity) || quantity <= 0) {
      await ctx.reply(ctx.t('telegram.buy.invalidQuantity'))
      return
    }

    await ctx.reply(ctx.t('telegram.buy.askSymbol'))
    const symCtx = await conversation.wait()
    if (!symCtx.message?.text || symCtx.message.text.trim().startsWith('/cancel')) {
      await ctx.reply(ctx.t('telegram.cancel'))
      return
    }
    const symbol = symCtx.message.text.trim().toUpperCase()
    if (!symbol || symbol.length > 20) {
      await ctx.reply(ctx.t('telegram.buy.invalidSymbol'))
      return
    }

    await ctx.reply(ctx.t('telegram.buy.askPrice'))
    const priceCtx = await conversation.wait()
    if (!priceCtx.message?.text || priceCtx.message.text.trim().startsWith('/cancel')) {
      await ctx.reply(ctx.t('telegram.cancel'))
      return
    }
    const price = parseFloat(priceCtx.message.text.trim())
    if (isNaN(price) || price <= 0) {
      await ctx.reply(ctx.t('telegram.buy.invalidPrice'))
      return
    }

    await ctx.reply(
      ctx.t('telegram.buy.confirm', { quantity, symbol, price })
    )
    const confirmCtx = await conversation.wait()
    const confirmText = confirmCtx.message?.text?.trim().toLowerCase()
    if (confirmText === 'yes' || confirmText === 'y') {
      await createBuySellDiary(ctx, userId, symbol, quantity, price, 'BUY')
    } else {
      await ctx.reply(ctx.t('telegram.cancel'))
    }
  }, 'buy')
}

// ─── Sell Conversation ──────────────────────────────────────────────────────

export function createSellConversation() {
  return createConversation(async (conversation, ctx: Ctx) => {
    const userId = await requireLinked(ctx)
    if (!userId) return

    await ctx.reply(ctx.t('telegram.sell.askQuantity'))
    const qtyCtx = await conversation.wait()
    if (!qtyCtx.message?.text || qtyCtx.message.text.trim().startsWith('/cancel')) {
      await ctx.reply(ctx.t('telegram.cancel'))
      return
    }
    const quantity = parseFloat(qtyCtx.message.text.trim())
    if (isNaN(quantity) || quantity <= 0) {
      await ctx.reply(ctx.t('telegram.sell.invalidQuantity'))
      return
    }

    await ctx.reply(ctx.t('telegram.sell.askSymbol'))
    const symCtx = await conversation.wait()
    if (!symCtx.message?.text || symCtx.message.text.trim().startsWith('/cancel')) {
      await ctx.reply(ctx.t('telegram.cancel'))
      return
    }
    const symbol = symCtx.message.text.trim().toUpperCase()
    if (!symbol || symbol.length > 20) {
      await ctx.reply(ctx.t('telegram.sell.invalidSymbol'))
      return
    }

    await ctx.reply(ctx.t('telegram.sell.askPrice'))
    const priceCtx = await conversation.wait()
    if (!priceCtx.message?.text || priceCtx.message.text.trim().startsWith('/cancel')) {
      await ctx.reply(ctx.t('telegram.cancel'))
      return
    }
    const price = parseFloat(priceCtx.message.text.trim())
    if (isNaN(price) || price <= 0) {
      await ctx.reply(ctx.t('telegram.sell.invalidPrice'))
      return
    }

    await ctx.reply(
      ctx.t('telegram.sell.confirm', { quantity, symbol, price })
    )
    const confirmCtx = await conversation.wait()
    const confirmText = confirmCtx.message?.text?.trim().toLowerCase()
    if (confirmText === 'yes' || confirmText === 'y') {
      await createBuySellDiary(ctx, userId, symbol, quantity, price, 'SELL')
    } else {
      await ctx.reply(ctx.t('telegram.cancel'))
    }
  }, 'sell')
}

// ─── Note Conversation ──────────────────────────────────────────────────────

export function createNoteConversation() {
  return createConversation(async (conversation, ctx: Ctx) => {
    const userId = await requireLinked(ctx)
    if (!userId) return

    await ctx.reply(ctx.t('telegram.note.askContent'))
    const contentCtx = await conversation.wait()
    if (!contentCtx.message?.text || contentCtx.message.text.trim().startsWith('/cancel')) {
      await ctx.reply(ctx.t('telegram.cancel'))
      return
    }
    const content = contentCtx.message.text.trim()
    if (!content || content.length > 2000) {
      await ctx.reply(ctx.t('telegram.note.tooLong'))
      return
    }

    await createNoteDiary(ctx, userId, content)
  }, 'note')
}
