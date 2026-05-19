import { deleteTelegramAccount, findTelegramAccount } from '~/server/utils/telegram-db'
import { Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'

/**
 * Unlink Telegram account from current user.
 * DELETE /api/telegram/unlink
 *
 * Requires JWT auth. Deletes the TelegramAccount record.
 */

export default defineEventHandler(async (event) => {
  const log = logger.telegram.withRequestId(event.context.requestId)
  const userId = event.context.user?.id
  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const body = await readBody(event)
  const telegramId = body?.telegramId
  if (!telegramId) {
    throw Errors.validationError([{ field: 'telegramId', message: 'Required' }]).toH3Error()
  }

  // Verify ownership: ensure this Telegram account belongs to the authenticated user
  const account = await findTelegramAccount(BigInt(telegramId))
  if (!account || account.userId !== BigInt(userId)) {
    throw Errors.forbidden('This Telegram account is not linked to your user').toH3Error()
  }

  await deleteTelegramAccount(BigInt(telegramId))

  return { ok: true }
})
