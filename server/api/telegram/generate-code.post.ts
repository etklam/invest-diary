import { createVerificationCode } from '~/server/utils/telegram-db'
import { Errors } from '~/lib/errors/factory'

/**
 * Generate a short-lived verification code for Telegram login.
 * POST /api/telegram/generate-code
 *
 * Requires JWT auth (user must be logged in to the web app).
 * Returns a 6-character code valid for 10 minutes.
 */

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id
  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const code = await createVerificationCode(BigInt(userId))

  return {
    code,
    expiresIn: 600, // 10 minutes in seconds
  }
})
