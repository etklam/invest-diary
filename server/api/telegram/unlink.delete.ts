import { deleteTelegramAccount } from '~/server/utils/telegram-db'
import { Errors } from '~/lib/errors/factory'

/**
 * Unlink Telegram account from current user.
 * DELETE /api/telegram/unlink
 *
 * Requires JWT auth. Deletes the TelegramAccount record.
 */

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id
  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const body = await readBody(event)
  const telegramId = body?.telegramId
  if (!telegramId) {
    throw Errors.validationError([{ field: 'telegramId', message: 'Required' }]).toH3Error()
  }

  await deleteTelegramAccount(BigInt(telegramId))

  return { ok: true }
})
