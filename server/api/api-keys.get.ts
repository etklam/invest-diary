import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)

  const keys = await prisma.apiKeyCredential.findMany({
    where: { userId: BigInt(user.id) },
    orderBy: { createdAt: 'desc' },
  })

  return {
    keys: keys.map((key: (typeof keys)[number]) => ({
      id: key.id.toString(),
      label: key.label,
      keyPrefix: key.keyPrefix,
      scope: key.scope,
      lastUsedAt: key.lastUsedAt ? key.lastUsedAt.toISOString() : null,
      revokedAt: key.revokedAt ? key.revokedAt.toISOString() : null,
      createdAt: key.createdAt.toISOString(),
    })),
  }
})
