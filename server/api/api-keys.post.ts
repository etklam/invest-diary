import { z } from 'zod'
import prisma from '~/lib/prisma'
import { AppError, Errors } from '~/lib/errors/factory'
import { requireUser } from '~/server/utils/auth'
import { generateApiKey } from '~/server/utils/api-key'
import { normalizedRequiredString } from '~/server/utils/validation'

const createApiKeySchema = z.object({
  label: normalizedRequiredString('label', 100),
})

export default defineEventHandler(async (event) => {
  try {
    const user = requireUser(event)
    const body = await readBody(event)
    const validated = createApiKeySchema.parse(body)
    const generated = generateApiKey()

    const key = await prisma.apiKeyCredential.create({
      data: {
        userId: BigInt(user.id),
        label: validated.label,
        keyHash: generated.keyHash,
        keyPrefix: generated.keyPrefix,
      },
    })

    return {
      key: {
        id: key.id.toString(),
        label: key.label,
        keyPrefix: key.keyPrefix,
        scope: key.scope,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: key.createdAt.toISOString(),
      },
      rawKey: generated.rawKey,
    }
  } catch (error) {
    if (error instanceof AppError) {
      throw error.toH3Error()
    }
    if (error instanceof z.ZodError) {
      throw Errors.validationError(error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))).toH3Error()
    }
    throw Errors.internalError(error).toH3Error()
  }
})
