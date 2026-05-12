import prisma from '~/lib/prisma'
import { requireUser } from '~/server/utils/auth'
import { parsePositiveBigIntParam } from '~/server/utils/validation'
import { logger } from '~/lib/logger'
import { Errors } from '~/lib/errors/factory'

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
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
    throw Errors.notFound('API key not found').toH3Error()
  }

  await prisma.apiKeyCredential.update({
    where: { id: keyId },
    data: { revokedAt: new Date() },
  })

  return { success: true }
})
