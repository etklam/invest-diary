import { beforeEach, describe, expect, it, vi } from 'vitest'
import { anAlert, aDiary } from '../fixtures/builders'
import { mockLogger, mockRequireUser } from '../vi-setup'

const mockAlertFindMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    alert: {
      findMany: mockAlertFindMany,
    },
  },
}))

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/lib/logger', () => mockLogger('alert'))

describe('GET /api/alerts — BigInt serialization contract', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: 1n })
  })

  it('returns alert id and diary.id as string (not bigint)', async () => {
    // Prisma 回傳的原始資料，id 是 BigInt
    mockAlertFindMany.mockResolvedValue([
      anAlert({
        id: 42n,
        message: 'Test alert',
        triggerAt: new Date('2026-06-14T10:00:00.000Z'),
        diary: aDiary({ id: 7n, title: 'My Diary' }),
      }),
    ])

    const { default: handler } = await import('~/server/api/alerts/index.get')

    const result = await handler({ context: { requestId: 'req-alerts-list' } } as any)

    const alert = Array.isArray(result) ? result[0] : result

    // id 必須是 string，不是 bigint 也不是 number
    expect(typeof alert.id).toBe('string')
    expect(alert.id).toBe('42')

    // diary.id 也必須是 string
    expect(alert.diary).toBeDefined()
    expect(typeof alert.diary.id).toBe('string')
    expect(alert.diary.id).toBe('7')
  })

  it('produces JSON-serializable output (no BigInt throws)', async () => {
    mockAlertFindMany.mockResolvedValue([
      anAlert({
        id: 99n,
        message: 'Serialization test',
        triggerAt: new Date('2026-06-14T12:00:00.000Z'),
        diary: aDiary({ id: 3n, title: 'Diary 3' }),
      }),
    ])

    const { default: handler } = await import('~/server/api/alerts/index.get')

    const result = await handler({ context: { requestId: 'req-alerts-list' } } as any)

    // JSON.stringify 不應丟出 TypeError: Do not know how to serialize a BigInt
    expect(() => JSON.stringify(result)).not.toThrow()
  })
})
