import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'

export default defineEventHandler(async (event) => {
  const user = requireUser(event)
  const keyId = parsePositiveBigIntParam(event, 'id')

  const existing = await prisma.apiKeyCredential.findFirst({
    where: {
      id: keyId,
      userId: BigInt(user.id),
      revokedAt: null,
    },
  })

  if (!existing) {
    throw createError({
      statusCode: 404,
      statusMessage: 'API key not found',
    })
  }

  await prisma.apiKeyCredential.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })

  return { success: true }
})
