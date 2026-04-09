import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetHeader, mockReadBody } from '../vi-setup'

const mockApiKeyFindUnique = vi.fn()
const mockApiKeyUpdate = vi.fn()
const mockDiaryFindFirst = vi.fn()
const mockDiaryCreate = vi.fn()
const mockDiaryUpdate = vi.fn()
const mockDiaryLogInfo = vi.fn()
const mockDiaryLogWarn = vi.fn()
const mockDiaryLogError = vi.fn()
const mockDiaryWithRequestId = vi.fn(() => ({
  info: mockDiaryLogInfo,
  warn: mockDiaryLogWarn,
  error: mockDiaryLogError,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    apiKeyCredential: {
      findUnique: mockApiKeyFindUnique,
      update: mockApiKeyUpdate,
    },
    diary: {
      findFirst: mockDiaryFindFirst,
      create: mockDiaryCreate,
      update: mockDiaryUpdate,
    },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    diary: {
      withRequestId: mockDiaryWithRequestId,
    },
  },
}))

describe('Agent diary API route', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetHeader.mockImplementation((_event, name) => name === 'x-api-key' ? 'dva_test_secret' : null)
    mockReadBody.mockResolvedValue(null)
  })

  it('creates a diary with API key scope and audit metadata', async () => {
    mockApiKeyFindUnique.mockResolvedValue({
      id: 31n,
      label: 'OpenClaw',
      scope: 'DIARY_CREATE',
      revokedAt: null,
      user: {
        id: 7n,
        email: 'partner@example.com',
        role: 'USER',
        name: 'Partner AI',
      },
    })
    mockReadBody.mockResolvedValue({
      title: 'AI market diary',
      content: 'The market rotated into semis.',
      date: '2026-04-09',
    })
    mockDiaryFindFirst.mockResolvedValue(null)
    mockDiaryCreate.mockResolvedValue({
      id: 101n,
      userId: 7n,
      title: 'AI market diary',
      content: 'The market rotated into semis.',
      tagsString: null,
      createdVia: 'API_KEY',
      createdByLabel: 'OpenClaw',
      date: new Date('2026-04-09T12:00:00.000Z'),
      createdAt: new Date('2026-04-09T12:00:00.000Z'),
      updatedAt: new Date('2026-04-09T12:00:00.000Z'),
      transactions: [],
      alerts: [],
    })

    const { default: handler } = await import('~/server/api/agent/diaries.post')

    const result = await handler({
      context: {
        requestId: 'req-agent-create',
      },
    } as any)

    expect(mockApiKeyUpdate).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 31n },
      data: expect.objectContaining({
        lastUsedAt: expect.any(Date),
      }),
    }))
    expect(mockDiaryCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        userId: 7n,
        createdVia: 'API_KEY',
        createdByLabel: 'OpenClaw',
      }),
    }))
    expect(result.createdVia).toBe('API_KEY')
    expect(result.createdByLabel).toBe('OpenClaw')
  })

  it('rejects append mode for API key diary creation', async () => {
    mockApiKeyFindUnique.mockResolvedValue({
      id: 31n,
      label: 'OpenClaw',
      scope: 'DIARY_CREATE',
      revokedAt: null,
      user: {
        id: 7n,
        email: 'partner@example.com',
        role: 'USER',
        name: 'Partner AI',
      },
    })
    mockReadBody.mockResolvedValue({
      title: 'AI market diary',
      content: 'No append',
      appendToToday: true,
    })

    const { default: handler } = await import('~/server/api/agent/diaries.post')

    await expect(handler({
      context: {
        requestId: 'req-agent-append',
      },
    } as any)).rejects.toMatchObject({
      statusCode: 400,
    })

    expect(mockDiaryCreate).not.toHaveBeenCalled()
    expect(mockDiaryLogWarn).toHaveBeenCalled()
  })
})
