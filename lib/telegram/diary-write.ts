import { logger } from '~/lib/logger'

const log = logger.telegram

/**
 * Shared diary creation helpers for Telegram conversations and one-liner commands.
 * Extracted from commands.ts so both commands.ts and conversations.ts can use the same logic.
 */

export async function createBuySellDiary(
  ctx: any,
  userId: bigint,
  symbol: string,
  quantity: number,
  price: number,
  type: 'BUY' | 'SELL'
) {
  const t = ctx.t.bind(ctx)
  try {
    const { createDiaryForUser } = await import('~/server/utils/diary-write')
    const { default: prisma } = await import('~/lib/prisma')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    const timezone = user?.timezone ?? 'Asia/Taipei'

    const now = new Date()
    const dateStr = now.toLocaleDateString('zh-TW', { timeZone: timezone })
    const direction = type === 'BUY' ? '買入' : '賣出'
    const title = `${direction} ${symbol} x${quantity} - ${dateStr}`
    const total = quantity * price
    const content = `${direction} ${quantity} ${symbol} @ ${price}，總金額 ${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

    await createDiaryForUser({
      userId,
      body: {
        title,
        content,
        transactions: [{
          symbol,
          type,
          quantity,
          price,
          tradeDate: new Date(),
        }],
      },
      createdVia: 'TELEGRAM_BOT',
      createdByLabel: 'Telegram',
    })

    await ctx.reply(
      t(`telegram.${type === 'BUY' ? 'buy' : 'sell'}.oneLinerSuccess`, {
        quantity,
        symbol,
        price,
        total,
      })
    )
  } catch (err) {
    log.error('Failed to create buy/sell diary', { symbol, type, error: String(err) })
    await ctx.reply(t('telegram.errors.dbWriteFailed'))
  }
}

export async function createNoteDiary(ctx: any, userId: bigint, content: string) {
  const t = ctx.t.bind(ctx)
  try {
    const { createDiaryForUser } = await import('~/server/utils/diary-write')
    const { default: prisma } = await import('~/lib/prisma')

    const user = await prisma.user.findUnique({ where: { id: userId } })
    const timezone = user?.timezone ?? 'Asia/Taipei'

    const now = new Date()
    const dateStr = now.toLocaleDateString('zh-TW', { timeZone: timezone })
    const title = `日記 - ${dateStr}`

    await createDiaryForUser({
      userId,
      body: {
        title,
        content,
      },
      createdVia: 'TELEGRAM_BOT',
      createdByLabel: 'Telegram',
    })

    await ctx.reply(t('telegram.note.success'))
  } catch (err) {
    log.error('Failed to create note diary', { error: String(err) })
    await ctx.reply(t('telegram.errors.dbWriteFailed'))
  }
}
