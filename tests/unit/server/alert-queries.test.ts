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

import { dismissAlert } from '~/server/utils/alert-queries'

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
