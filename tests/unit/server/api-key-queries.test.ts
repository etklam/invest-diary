/**
 * Unit tests for api-key-queries — query layer + Zod validation.
 *
 * Mirrors the structure of discipline-queries.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks ---
const {
  mockApiKeyFindMany,
  mockApiKeyFindFirst,
  mockApiKeyCreate,
  mockApiKeyUpdate,
  mockGenerateApiKey,
} = vi.hoisted(() => ({
  mockApiKeyFindMany: vi.fn(),
  mockApiKeyFindFirst: vi.fn(),
  mockApiKeyCreate: vi.fn(),
  mockApiKeyUpdate: vi.fn(),
  mockGenerateApiKey: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    apiKeyCredential: {
      findMany: mockApiKeyFindMany,
      findFirst: mockApiKeyFindFirst,
      create: mockApiKeyCreate,
      update: mockApiKeyUpdate,
    },
  },
}))

vi.mock('~/server/utils/api-key', () => ({
  generateApiKey: mockGenerateApiKey,
}))

// --- Import SUT after mocks ---
import {
  listApiKeysForUser,
  createApiKeyForUser,
  revokeApiKey,
  createApiKeySchema,
  API_KEY_SCOPE_VALUES,
} from '~/server/utils/api-key-queries'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const USER_ID = 1n
const OTHER_USER_ID = 999n
const KEY_ID = 5n

const mockKeyRow = {
  id: KEY_ID,
  label: 'primary',
  keyPrefix: 'dva_primary_',
  scope: 'DIARY_CREATE',
  lastUsedAt: null,
  revokedAt: null,
  createdAt: new Date('2026-05-01T00:00:00Z'),
}

describe('api-key-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGenerateApiKey.mockReturnValue({
      rawKey: 'dva_raw',
      keyHash: 'hash(dva_raw)',
      keyPrefix: 'dva_raw',
    })
  })

  // ─── listApiKeysForUser ───────────────────────────────────────────────
  describe('listApiKeysForUser', () => {
    it('lists keys for the user, newest first, with the limited select', async () => {
      mockApiKeyFindMany.mockResolvedValue([mockKeyRow])

      const result = await listApiKeysForUser(USER_ID)

      expect(mockApiKeyFindMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { createdAt: 'desc' },
        select: expect.objectContaining({
          id: true,
          label: true,
        }),
      })
      // Confirm keyHash is excluded so the secret never leaks through the API.
      const selectArg = mockApiKeyFindMany.mock.calls[0][0].select
      expect(selectArg.keyHash).toBeUndefined()
      expect(result).toHaveLength(1)
    })

    it('returns empty array when user has no keys', async () => {
      mockApiKeyFindMany.mockResolvedValue([])
      expect(await listApiKeysForUser(USER_ID)).toEqual([])
    })

    it('does not accept a userId argument that belongs to another user', async () => {
      mockApiKeyFindMany.mockResolvedValue([])
      await listApiKeysForUser(OTHER_USER_ID)
      expect(mockApiKeyFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { userId: OTHER_USER_ID } }),
      )
    })
  })

  // ─── createApiKeyForUser ──────────────────────────────────────────────
  describe('createApiKeyForUser', () => {
    it('creates a key and returns { key, rawKey }', async () => {
      mockApiKeyCreate.mockResolvedValue(mockKeyRow)

      const result = await createApiKeyForUser(USER_ID, {
        label: 'primary',
        scope: 'DIARY_CREATE',
      })

      expect(mockGenerateApiKey).toHaveBeenCalled()
      expect(mockApiKeyCreate).toHaveBeenCalledWith({
        data: {
          userId: USER_ID,
          label: 'primary',
          keyHash: 'hash(dva_raw)',
          keyPrefix: 'dva_raw',
          scope: 'DIARY_CREATE',
        },
        select: expect.objectContaining({ label: true }),
      })
      const selectArg = mockApiKeyCreate.mock.calls[0][0].select
      expect(selectArg.keyHash).toBeUndefined()
      expect(result.rawKey).toBe('dva_raw')
      expect(result.key).toEqual(mockKeyRow)
    })

    it('defaults scope to DIARY_CREATE', async () => {
      mockApiKeyCreate.mockResolvedValue(mockKeyRow)

      await createApiKeyForUser(USER_ID, { label: 'x' })

      expect(mockApiKeyCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'DIARY_CREATE' }),
        }),
      )
    })

    it('accepts AGENT_WRITE scope', async () => {
      mockApiKeyCreate.mockResolvedValue(mockKeyRow)

      await createApiKeyForUser(USER_ID, { label: 'x', scope: 'AGENT_WRITE' })

      expect(mockApiKeyCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'AGENT_WRITE' }),
        }),
      )
    })

    it('throws ZodError when label is missing', async () => {
      await expect(createApiKeyForUser(USER_ID, {})).rejects.toThrow()
      expect(mockApiKeyCreate).not.toHaveBeenCalled()
    })

    it('throws ZodError for unknown scope', async () => {
      await expect(
        createApiKeyForUser(USER_ID, { label: 'x', scope: 'ROOT' }),
      ).rejects.toThrow()
      expect(mockApiKeyCreate).not.toHaveBeenCalled()
    })
  })

  // ─── revokeApiKey ─────────────────────────────────────────────────────
  describe('revokeApiKey', () => {
    it('sets revokedAt when key is owned and active', async () => {
      mockApiKeyFindFirst.mockResolvedValue({ id: KEY_ID, userId: USER_ID, revokedAt: null })

      await revokeApiKey(KEY_ID, USER_ID)

      expect(mockApiKeyFindFirst).toHaveBeenCalledWith({
        where: { id: KEY_ID, userId: USER_ID, revokedAt: null },
      })
      expect(mockApiKeyUpdate).toHaveBeenCalledWith({
        where: { id: KEY_ID },
        data: { revokedAt: expect.any(Date) },
      })
    })

    it('accepts string keyId and converts to BigInt', async () => {
      mockApiKeyFindFirst.mockResolvedValue({ id: KEY_ID, userId: USER_ID, revokedAt: null })

      await revokeApiKey('5', USER_ID)

      expect(mockApiKeyFindFirst).toHaveBeenCalledWith({
        where: { id: 5n, userId: USER_ID, revokedAt: null },
      })
    })

    it('throws notFound when key does not exist (no existence leak)', async () => {
      mockApiKeyFindFirst.mockResolvedValue(null)

      await expect(revokeApiKey(KEY_ID, USER_ID)).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(mockApiKeyUpdate).not.toHaveBeenCalled()
    })

    it('throws notFound when key belongs to another user (no existence leak)', async () => {
      // findFirst with { id, userId } won't match other-user rows, returns null.
      mockApiKeyFindFirst.mockResolvedValue(null)

      await expect(revokeApiKey(KEY_ID, OTHER_USER_ID)).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(mockApiKeyUpdate).not.toHaveBeenCalled()
    })

    it('throws notFound when key is already revoked (idempotent revoke)', async () => {
      mockApiKeyFindFirst.mockResolvedValue(null)

      await expect(revokeApiKey(KEY_ID, USER_ID)).rejects.toMatchObject({
        statusCode: 404,
      })
      expect(mockApiKeyUpdate).not.toHaveBeenCalled()
    })
  })

  // ─── Zod schemas ──────────────────────────────────────────────────────
  describe('createApiKeySchema', () => {
    it('accepts label + AGENT_WRITE', () => {
      const r = createApiKeySchema.parse({ label: 'X', scope: 'AGENT_WRITE' })
      expect(r.scope).toBe('AGENT_WRITE')
    })

    it('defaults scope to DIARY_CREATE', () => {
      const r = createApiKeySchema.parse({ label: 'X' })
      expect(r.scope).toBe('DIARY_CREATE')
    })

    it('rejects empty label', () => {
      expect(() => createApiKeySchema.parse({ label: '' })).toThrow()
    })

    it('rejects unknown scope', () => {
      expect(() =>
        createApiKeySchema.parse({ label: 'X', scope: 'ADMIN' }),
      ).toThrow()
    })
  })

  describe('API_KEY_SCOPE_VALUES', () => {
    it('exports the canonical scope tuple (single source of truth)', () => {
      expect(API_KEY_SCOPE_VALUES).toEqual(['DIARY_CREATE', 'AGENT_WRITE'])
    })
  })
})
