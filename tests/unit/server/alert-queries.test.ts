import { beforeEach, describe, expect, it, vi } from 'vitest'

const { mockAlertFindFirst, mockAlertUpdate } = vi.hoisted(() => ({
  mockAlertFindFirst: vi.fn(),
  mockAlertUpdate: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    alert: {
      findFirst: mockAlertFindFirst,
      update: mockAlertUpdate,
    },
  },
}))

vi.mock('~/server/utils/alert-persistence', () => ({
  persistAlert: vi.fn(),
}))

vi.mock('~/server/utils/diary-read', () => ({
  findDiaryForUser: vi.fn(),
}))

import { CreateAlertSchema, dismissAlert } from '~/server/utils/alert-queries'

describe('CreateAlertSchema', () => {
  it('accepts a parseable trigger_at string', () => {
    const parsed = CreateAlertSchema.parse({
      diary_id: '1',
      message: 'Review',
      trigger_at: '2026-06-01T09:30:00Z',
    })
    expect(parsed.trigger_at).toBe('2026-06-01T09:30:00Z')
  })

  it('accepts a Date trigger_at', () => {
    const date = new Date('2026-06-01T09:30:00Z')
    const parsed = CreateAlertSchema.parse({
      diary_id: '1',
      message: 'Review',
      trigger_at: date,
    })
    expect(parsed.trigger_at).toBe(date)
  })

  it('rejects a garbage trigger_at string instead of letting an Invalid Date reach recurring-alerts (500)', () => {
    const result = CreateAlertSchema.safeParse({
      diary_id: '1',
      message: 'Review',
      trigger_at: 'not-a-date',
    })

    expect(result.success).toBe(false)
    if (!result.success) {
      expect(result.error.issues[0].message).toBe('trigger_at must be a valid date')
    }
  })

  it('rejects a garbage camelCase triggerAt alias too', () => {
    const result = CreateAlertSchema.safeParse({
      diary_id: '1',
      message: 'Review',
      triggerAt: 'next tuesday maybe',
    })

    expect(result.success).toBe(false)
  })
})

describe('dismissAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('dismisses an alert only after finding it through the owning diary', async () => {
    mockAlertFindFirst.mockResolvedValue({ id: 42n })
    mockAlertUpdate.mockResolvedValue({ id: 42n, isDismissed: true })

    await expect(dismissAlert('42', 7n)).resolves.toEqual({ id: 42n, isDismissed: true })

    expect(mockAlertFindFirst).toHaveBeenCalledWith({
      where: { id: 42n, diary: { userId: 7n } },
    })
    expect(mockAlertUpdate).toHaveBeenCalledWith({
      where: { id: 42n },
      data: { isDismissed: true },
    })
  })

  it('rejects an alert that is missing or owned by another user', async () => {
    mockAlertFindFirst.mockResolvedValue(null)

    await expect(dismissAlert(42n, 9n)).rejects.toMatchObject({
      statusCode: 404,
      statusMessage: 'Alert 42 not found',
    })
    expect(mockAlertUpdate).not.toHaveBeenCalled()
  })
})
