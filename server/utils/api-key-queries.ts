/**
 * API Key Credential query layer — CRUD operations for user-issued API keys.
 *
 * Validation via Zod, ownership verification for revoke.
 * Returns raw Prisma results; handlers call serialize().
 *
 * Scope single source of truth: prisma/schema.prisma defines the ApiKeyScope
 * enum (DIARY_CREATE | AGENT_WRITE); this module mirrors it as the API-level
 * contract so handlers no longer inline the literal list.
 *
 * Symmetric with discipline-queries.ts in structure.
 */

import { z } from 'zod'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { generateApiKey } from '~/server/utils/api-key'
import { normalizedRequiredString } from '~/server/utils/validation'
import type { ApiKeyScope } from '@prisma/client'

// ─── Zod Schemas ──────────────────────────────────────────────────────────────

/**
 * Scope list — DB enum mirror (prisma/schema.prisma :: enum ApiKeyScope).
 * Exported so handlers/agents can reuse the literal tuple instead of retyping.
 */
export const API_KEY_SCOPE_VALUES = ['DIARY_CREATE', 'AGENT_WRITE'] as const

export const createApiKeySchema = z.object({
  label: normalizedRequiredString('label', 100),
  scope: z.enum(API_KEY_SCOPE_VALUES).default('DIARY_CREATE'),
})

export type CreateApiKeyInput = z.infer<typeof createApiKeySchema>

// ─── Select helpers (DRY) ─────────────────────────────────────────────────────

const API_KEY_LIST_SELECT = {
  id: true,
  label: true,
  keyPrefix: true,
  scope: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
} as const

// ─── Query Functions ──────────────────────────────────────────────────────────

/**
 * List all API keys for a user, newest first. Excludes the keyHash.
 */
export async function listApiKeysForUser(userId: bigint) {
  return prisma.apiKeyCredential.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: API_KEY_LIST_SELECT,
  })
}

/**
 * Create a new API key for a user.
 * Generates rawKey + hash, persists the hash; rawKey is returned once for the
 * caller to display. Validates label + scope via Zod.
 */
export async function createApiKeyForUser(
  userId: bigint,
  input: unknown,
): Promise<{ key: Awaited<ReturnType<typeof prisma.apiKeyCredential.create>>; rawKey: string; scope: ApiKeyScope }> {
  const validated = createApiKeySchema.parse(input)
  const generated = generateApiKey()

  const key = await prisma.apiKeyCredential.create({
    data: {
      userId,
      label: validated.label,
      keyHash: generated.keyHash,
      keyPrefix: generated.keyPrefix,
      scope: validated.scope,
    },
    select: API_KEY_LIST_SELECT,
  })

  return { key, rawKey: generated.rawKey, scope: validated.scope }
}

/**
 * Revoke an active API key (sets revokedAt). Verifies ownership + activeness
 * via findFirst({ id, userId, revokedAt: null }) — does not leak existence of
 * revoked or non-owned keys (returns notFound either way).
 */
export async function revokeApiKey(
  keyId: bigint | string,
  userId: bigint,
): Promise<void> {
  const id = typeof keyId === 'string' ? BigInt(keyId) : keyId

  const existing = await prisma.apiKeyCredential.findFirst({
    where: { id, userId, revokedAt: null },
  })

  if (!existing) {
    throw Errors.notFound('API key not found').toH3Error()
  }

  await prisma.apiKeyCredential.update({
    where: { id },
    data: { revokedAt: new Date() },
  })
}
