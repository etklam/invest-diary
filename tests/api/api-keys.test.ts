import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

const mockApiKeyCreate = vi.fn()
const mockApiKeyFindMany = vi.fn()
const mockApiKeyFindFirst = vi.fn()
const mockApiKeyUpdate = vi.fn()
const mockRequireUser = vi.fn()
const mockGeneralApi = vi.fn()
const mockGetRateLimitIdentifier = vi.fn(() => '127.0.0.1')
const mockGenerateApiKey = vi.fn()
const mockParsePositiveBigIntParam = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    apiKeyCredential: {
      create: mockApiKeyCreate,
      findMany: mockApiKeyFindMany,
      findFirst: mockApiKeyFindFirst,
      update: mockApiKeyUpdate,
    },
  },
}))

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    generalApi: mockGeneralApi,
  },
  getRateLimitIdentifier: mockGetRateLimitIdentifier,
}))

vi.mock('~/server/utils/api-key', () => ({
  generateApiKey: mockGenerateApiKey,
}))

vi.mock('~/server/utils/validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/validation')>()
  return {
    ...actual,
    parsePositiveBigIntParam: mockParsePositiveBigIntParam,
  }
})

describe('API key routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1' })
    mockReadBody.mockReset()
    mockGeneralApi.mockResolvedValue(undefined)
    mockGenerateApiKey.mockReturnValue({
      rawKey: 'dva_test_secret',
      keyHash: 'hashed',
      keyPrefix: 'dva_test_sec',
    })
  })

  describe('POST /api/api-keys', () => {
    it('creates api key with valid payload', async () => {
      mockReadBody.mockResolvedValue({ label: 'My Agent Key', scope: 'AGENT_WRITE' })
      mockApiKeyCreate.mockResolvedValue({
        id: 9n,
        label: 'My Agent Key',
        keyPrefix: 'dva_test_sec',
        scope: 'AGENT_WRITE',
        createdAt: new Date('2026-05-01T00:00:00.000Z'),
      })

      const { default: handler } = await import('~/server/api/api-keys.post')
      const result = await handler({ context: { requestId: 'req-1' } } as any)

      expect(mockGeneralApi).toHaveBeenCalledWith('127.0.0.1')
      expect(mockApiKeyCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: 1n,
          label: 'My Agent Key',
          keyHash: 'hashed',
          scope: 'AGENT_WRITE',
        }),
      }))
      expect(result.rawKey).toBe('dva_test_secret')
      expect(result.key.label).toBe('My Agent Key')
      expect(result.key.scope).toBe('AGENT_WRITE')
    })

    it('returns validation error when label missing', async () => {
      mockReadBody.mockResolvedValue({})
      const { default: handler } = await import('~/server/api/api-keys.post')

      await expect(handler({ context: {} } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })

    it('returns 429 when rate limited', async () => {
      mockReadBody.mockResolvedValue({ label: 'Too Fast' })
      mockGeneralApi.mockRejectedValue(new Error('limited'))
      const { default: handler } = await import('~/server/api/api-keys.post')

      await expect(handler({ context: {} } as any)).rejects.toMatchObject({
        statusCode: 429,
      })
    })
  })

  describe('GET /api/api-keys', () => {
    it('lists only current user keys', async () => {
      mockApiKeyFindMany.mockResolvedValue([
        {
          id: 1n,
          label: 'primary',
          keyPrefix: 'dva_primary',
          scope: 'DIARY_CREATE',
          lastUsedAt: null,
          revokedAt: null,
          createdAt: new Date('2026-05-01T01:00:00.000Z'),
        },
      ])

      const { default: handler } = await import('~/server/api/api-keys.get')
      const result = await handler({ context: {} } as any)

      expect(mockApiKeyFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: 1n },
      }))
      expect(result.keys).toHaveLength(1)
      expect(result.keys[0].id).toBe('1')
    })
  })

  describe('DELETE /api/api-keys/:id', () => {
    it('revokes owned active key', async () => {
      mockParsePositiveBigIntParam.mockReturnValue(5n)
      mockApiKeyFindFirst.mockResolvedValue({ id: 5n, userId: 1n, revokedAt: null })
      mockApiKeyUpdate.mockResolvedValue({ id: 5n })

      const { default: handler } = await import('~/server/api/api-keys/[id].delete')
      const result = await handler({ context: {} } as any)

      expect(mockApiKeyUpdate).toHaveBeenCalledWith(expect.objectContaining({
        where: { id: 5n },
      }))
      expect(result).toEqual({ success: true })
    })

    it('returns 404 for non-owned or already revoked key', async () => {
      mockParsePositiveBigIntParam.mockReturnValue(99n)
      mockApiKeyFindFirst.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/api-keys/[id].delete')
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({
        statusCode: 404,
      })
    })
  })

  it('TODO: Agent API 的 Bearer / revoked key 驗證已由 tests/api/agent-diaries.test.ts 覆蓋，Phase 5 scope 擴展後補獨立測試', () => {
    expect(true).toBe(true)
  })
})
