import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { logger } from '~/lib/logger'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  const user = requireUser(event)

  const keys = await prisma.apiKeyCredential.findMany({
    where: { userId: BigInt(user.id) },
    orderBy: { createdAt: 'desc' },
  })

  return serialize({
    keys: keys.map((key: (typeof keys)[number]) => ({
      id: key.id,
      label: key.label,
      keyPrefix: key.keyPrefix,
      scope: key.scope,
      lastUsedAt: key.lastUsedAt,
      revokedAt: key.revokedAt,
      createdAt: key.createdAt,
    })),
  })
})
