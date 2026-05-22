import { z } from 'zod'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { generateApiKey } from '~/server/utils/api-key'
import { normalizedRequiredString } from '~/server/utils/validation'
import { rateLimiters, getRateLimitIdentifier } from '~/lib/rate-limiter'
import { enforceRateLimit } from '~/server/utils/rate-limit'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'

const createApiKeySchema = z.object({
  label: normalizedRequiredString('label', 100),
  scope: z.enum(['DIARY_CREATE', 'AGENT_WRITE']).default('DIARY_CREATE'),
})

export default defineEventHandler(async (event) => {
  const log = logger.api.withRequestId(event.context.requestId)
  try {
    const user = requireUser(event)

    await enforceRateLimit(
      rateLimiters.generalApi,
      getRateLimitIdentifier(event),
      log,
      'API key create rate limited',
      { userId: user.id }
    )

    const body = await readBody(event)
    const validated = createApiKeySchema.parse(body)
    const generated = generateApiKey()

    const key = await prisma.apiKeyCredential.create({
      data: {
        userId: BigInt(user.id),
        label: validated.label,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
        scope: validated.scope,
      },
    })

    return serialize({
      key: {
        id: key.id,
        label: key.label,
        keyPrefix: key.keyPrefix,
        scope: key.scope,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: key.createdAt,
      },
      rawKey: generated.rawKey,
    })
  } catch (error) {
    handleApiError(error, log)
  }
})
