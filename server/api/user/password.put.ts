import { clearAuthCookies, requireUser } from '~/server/utils/auth'
import { Errors } from '~/lib/errors/factory'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { logger } from '~/lib/logger'
import { handleApiError } from '~/server/utils/error-handler'
import { changeUserPassword } from '~/server/utils/user-queries'

export default defineEventHandler(async (event) => {
  const log = logger.auth.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    const ipIdentifier = getRateLimitIdentifier(event)
    try {
      await rateLimiters.authPasswordIp(ipIdentifier)
    } catch {
      log.warn('Password change rate limited', { ip: ipIdentifier })
      throw Errors.rateLimited(60).toH3Error()
    }

    try {
      await rateLimiters.authPasswordIdentity(user.id)
    } catch {
      log.warn('Password change rate limited', { ip: ipIdentifier, userId: user.id })
      throw Errors.rateLimited(60).toH3Error()
    }

    const body = await readBody(event)

    // changeUserPassword validates input, verifies current password, hashes
    // the new password, and runs the password update + tokenVersion increment
    // + refresh-token wipe in a single $transaction.
    await changeUserPassword(BigInt(user.id), body)

    // Clear current session cookies as well
    clearAuthCookies(event)

    log.info('Password changed', { userId: user.id })

    return {
      success: true,
      message: 'Password changed successfully. Please login again.'
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
