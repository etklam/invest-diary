import { createBot } from '~/lib/telegram/bot'
import { checkAndMarkUpdate } from '~/server/utils/telegram-db'

/**
 * Telegram Bot webhook endpoint.
 * POST /api/telegram/webhook
 *
 * Receives updates from Telegram. Validates secret token, enforces idempotency
 * via telegram_processed_updates, and delegates to grammY.
 */

export default defineEventHandler(async (event) => {
  // 1. Validate secret token (before any processing)
  const secretToken = getHeader(event, 'x-telegram-bot-api-secret-token')
  const config = useRuntimeConfig()
  if (!secretToken || secretToken !== config.telegramWebhookSecret) {
    throw createError({ statusCode: 401, message: 'Unauthorized' })
  }

  // 2. Get the bot token from runtime config
  const botToken = config.telegramBotToken as string
  if (!botToken) {
    throw createError({ statusCode: 500, message: 'Bot not configured' })
  }

  // 3. Read the update body
  const body = await readBody(event)
  if (!body || !body.update_id) {
    return { ok: true }
  }

  const updateId = body.update_id as number

  // 4. Determine if this is a write operation (needs idempotency guard)
  const isWrite = body.message?.text && /^\/(buy|sell|note)/.test(String(body.message.text))
  if (isWrite) {
    const isNew = await checkAndMarkUpdate(updateId, 'diary_write')
    if (!isNew) {
      // Already processed — return OK without re-executing
      return { ok: true }
    }
  }

  // 5. Per-request Bot initialization + handle update
  const bot = createBot(botToken)
  await bot.init()
  await bot.handleUpdate(body)

  return { ok: true }
})
