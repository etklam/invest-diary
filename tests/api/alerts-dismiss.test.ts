import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockLogger, mockRequireUser } from '../vi-setup'

const {
  mockParsePositiveBigIntParam,
  mockDismissAlert,
} = vi.hoisted(() => ({
  mockParsePositiveBigIntParam: vi.fn(),
  mockDismissAlert: vi.fn(),
}))

vi.mock('~/server/utils/auth', () => ({ requireUser: mockRequireUser }))
vi.mock('~/server/utils/validation', () => ({ parsePositiveBigIntParam: mockParsePositiveBigIntParam }))
vi.mock('~/server/utils/alert-queries', () => ({ dismissAlert: mockDismissAlert }))
vi.mock('~/server/utils/error-handler', () => ({ handleApiError: vi.fn() }))
vi.mock('~/lib/logger', () => mockLogger('alert'))

import handler from '~/server/api/alerts/[id]/dismiss.put'

describe('PUT /api/alerts/:id/dismiss', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '7' })
    mockParsePositiveBigIntParam.mockReturnValue(42n)
    mockDismissAlert.mockResolvedValue({
      id: 42n,
      diaryId: 3n,
      message: 'Review thesis',
      triggerAt: new Date('2026-06-03T09:30:00.000Z'),
      isDismissed: true,
      recurringMode: null,
      parentId: null,
      instanceNumber: 1,
      isPaused: false,
      createdAt: new Date('2026-06-01T09:30:00.000Z'),
      diary: { id: 3n, title: 'AAPL diary' },
    })
  })

  it('delegates dismiss ownership to the shared alert module', async () => {
    await handler({ context: { requestId: 'req-alert-dismiss' } } as any)

    expect(mockDismissAlert).toHaveBeenCalledWith(42n, 7n)
  })
})
