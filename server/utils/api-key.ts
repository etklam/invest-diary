import { createHash, randomBytes } from 'node:crypto'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'

const API_KEY_TOKEN_PREFIX = 'dva_'
const API_KEY_VISIBLE_PREFIX_LENGTH = 12

export interface ApiKeyAuthResult {
  apiKeyId: string
  label: string
  scope: 'DIARY_CREATE' | 'AGENT_WRITE'
  user: {
    id: string
    email: string
    role: string
    name: string | null
  }
}

function extractApiKeyFromHeader(value?: string | null) {
  if (!value) return null
  if (value.startsWith('Bearer ')) {
    return value.slice('Bearer '.length).trim()
  }
  return value.trim()
}

export function hashApiKey(rawKey: string) {
  return createHash('sha256').update(rawKey).digest('hex')
}

export function generateApiKey() {
  const secret = randomBytes(24).toString('hex')
  const rawKey = `${API_KEY_TOKEN_PREFIX}${secret}`

  return {
    rawKey,
    keyHash: hashApiKey(rawKey),
    keyPrefix: rawKey.slice(0, API_KEY_VISIBLE_PREFIX_LENGTH),
  }
}

export async function requireApiKey(
  event: any,
  allowedScopes: Array<'DIARY_CREATE' | 'AGENT_WRITE'>
): Promise<ApiKeyAuthResult> {
  const headerValue = getHeader(event, 'x-api-key') || getHeader(event, 'authorization')
  const rawKey = extractApiKeyFromHeader(headerValue)

  if (!rawKey) {
    throw Errors.apiKeyInvalid().toH3Error()
  }

  const keyHash = hashApiKey(rawKey)
  const credential = await prisma.apiKeyCredential.findUnique({
    where: { keyHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          role: true,
          name: true,
        },
      },
    },
  })

  if (!credential) {
    throw Errors.apiKeyInvalid().toH3Error()
  }

  if (credential.revokedAt) {
    throw Errors.apiKeyRevoked().toH3Error()
  }

  if (!allowedScopes.includes(credential.scope)) {
    throw Errors.apiKeyScopeDenied().toH3Error()
  }

  await prisma.apiKeyCredential.update({
    where: { id: credential.id },
    data: { lastUsedAt: new Date() },
  })

  return {
    apiKeyId: credential.id.toString(),
    label: credential.label,
    scope: credential.scope,
    user: {
      id: credential.user.id.toString(),
      email: credential.user.email,
      role: credential.user.role,
      name: credential.user.name,
    },
  }
}
