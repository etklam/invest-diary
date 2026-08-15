import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetHeader } from '../../vi-setup'

const { mockApiKeyFindUnique, mockApiKeyUpdate } = vi.hoisted(() => ({
  mockApiKeyFindUnique: vi.fn(),
  mockApiKeyUpdate: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    apiKeyCredential: {
      findUnique: mockApiKeyFindUnique,
      update: mockApiKeyUpdate,
    },
  },
}))

import { requireApiKey } from '~/server/utils/api-key'
import { sha256Hex } from '~/server/utils/hash'

const RAW_KEY = 'dva_test_secret'
const KEY_ID = 31n
const USER_ID = 7n

const credential = (overrides: Record<string, unknown> = {}) => ({
  id: KEY_ID,
  label: 'OpenClaw',
  scope: 'DIARY_CREATE' as const,
  revokedAt: null,
  user: {
    id: USER_ID,
    email: 'partner@example.com',
    role: 'USER',
    name: 'Partner AI',
  },
  ...overrides,
})

describe('requireApiKey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHeader.mockImplementation(() => null)
    mockApiKeyUpdate.mockResolvedValue(undefined)
  })

  it('extracts a raw key from x-api-key and looks up its SHA-256 hash', async () => {
    mockGetHeader.mockImplementation((_event, name) => name === 'x-api-key' ? RAW_KEY : null)
    mockApiKeyFindUnique.mockResolvedValue(credential())

    await requireApiKey({} as any, ['DIARY_CREATE'])

    expect(mockApiKeyFindUnique).toHaveBeenCalledWith({
      where: { keyHash: sha256Hex(RAW_KEY) },
      include: {
        user: {
          select: { id: true, email: true, role: true, name: true },
        },
      },
    })
  })

  it('extracts a dva_ key from Authorization: Bearer', async () => {
    mockGetHeader.mockImplementation((_event, name) => name === 'authorization' ? `Bearer ${RAW_KEY}` : null)
    mockApiKeyFindUnique.mockResolvedValue(credential())

    await expect(requireApiKey({} as any, ['DIARY_CREATE'])).resolves.toMatchObject({
      apiKeyId: String(KEY_ID),
    })
    expect(mockApiKeyFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { keyHash: sha256Hex(RAW_KEY) },
    }))
  })

  it('prefers x-api-key when both supported headers are present', async () => {
    mockGetHeader.mockImplementation((_event, name) => ({
      'x-api-key': RAW_KEY,
      authorization: 'Bearer dva_other_secret',
    }[name] ?? null))
    mockApiKeyFindUnique.mockResolvedValue(credential())

    await requireApiKey({} as any, ['DIARY_CREATE'])

    expect(mockApiKeyFindUnique.mock.calls[0][0].where).toEqual({ keyHash: sha256Hex(RAW_KEY) })
  })

  it('rejects a Bearer token with the legacy sk_ prefix', async () => {
    mockGetHeader.mockImplementation((_event, name) => name === 'authorization' ? 'Bearer sk_legacytoken' : null)
    mockApiKeyFindUnique.mockResolvedValue(null)

    await expect(requireApiKey({} as any, ['DIARY_CREATE'])).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Invalid API key',
    })
  })

  it('rejects a missing API key with 401 without querying the database', async () => {
    await expect(requireApiKey({} as any, ['DIARY_CREATE'])).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Invalid API key',
    })
    expect(mockApiKeyFindUnique).not.toHaveBeenCalled()
  })

  it('rejects an API key whose hash is not found', async () => {
    mockGetHeader.mockReturnValue(RAW_KEY)
    mockApiKeyFindUnique.mockResolvedValue(null)

    await expect(requireApiKey({} as any, ['DIARY_CREATE'])).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'Invalid API key',
    })
    expect(mockApiKeyUpdate).not.toHaveBeenCalled()
  })

  it('rejects a revoked API key with 401', async () => {
    mockGetHeader.mockReturnValue(RAW_KEY)
    mockApiKeyFindUnique.mockResolvedValue(credential({ revokedAt: new Date('2026-08-01T00:00:00Z') }))

    await expect(requireApiKey({} as any, ['DIARY_CREATE'])).rejects.toMatchObject({
      statusCode: 401,
      statusMessage: 'API key has been revoked',
    })
    expect(mockApiKeyUpdate).not.toHaveBeenCalled()
  })

  it('rejects an insufficient scope with 403 and a scope-denied message', async () => {
    mockGetHeader.mockReturnValue(RAW_KEY)
    mockApiKeyFindUnique.mockResolvedValue(credential())

    await expect(requireApiKey({} as any, ['AGENT_WRITE'])).rejects.toMatchObject({
      statusCode: 403,
      statusMessage: 'API key scope denied',
    })
    expect(mockApiKeyUpdate).not.toHaveBeenCalled()
  })

  it('allows a matching scope and touches lastUsedAt', async () => {
    mockGetHeader.mockReturnValue(RAW_KEY)
    mockApiKeyFindUnique.mockResolvedValue(credential())

    await requireApiKey({} as any, ['DIARY_CREATE'])

    expect(mockApiKeyUpdate).toHaveBeenCalledWith({
      where: { id: KEY_ID },
      data: { lastUsedAt: expect.any(Date) },
    })
  })

  it('normalizes BigInt identifiers in the returned auth payload', async () => {
    mockGetHeader.mockReturnValue(RAW_KEY)
    mockApiKeyFindUnique.mockResolvedValue(credential())

    await expect(requireApiKey({} as any, ['DIARY_CREATE'])).resolves.toEqual({
      apiKeyId: '31',
      label: 'OpenClaw',
      scope: 'DIARY_CREATE',
      user: {
        id: '7',
        email: 'partner@example.com',
        role: 'USER',
        name: 'Partner AI',
      },
    })
  })
})
