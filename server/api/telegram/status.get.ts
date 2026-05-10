import { Errors } from '~/lib/errors/factory'

/**
 * Get Telegram binding status for the current user.
 * GET /api/telegram/status
 *
 * Returns linked Telegram account info, or { linked: false } if not linked.
 */

export default defineEventHandler(async (event) => {
  const userId = event.context.user?.id
  if (!userId) {
    throw Errors.unauthorized().toH3Error()
  }

  const { default: prisma } = await import('~/lib/prisma')
  const account = await prisma.telegramAccount.findFirst({
    where: { userId: BigInt(userId) },
    select: {
      id: true,
      telegramId: true,
      username: true,
      firstName: true,
      lastName: true,
      language: true,
      linkedAt: true,
      lastActiveAt: true,
    },
  })

  if (!account) {
    return { linked: false }
  }

  return {
    linked: true,
    telegramId: String(account.telegramId),
    username: account.username,
    firstName: account.firstName,
    lastName: account.lastName,
    language: account.language,
    linkedAt: account.linkedAt,
    lastActiveAt: account.lastActiveAt,
  }
})
