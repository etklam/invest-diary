import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  mockRequireUser,
  mockParsePositiveBigIntParam,
  mockDismissAlert,
  mockSerialize,
  mockLogger,
} = vi.hoisted(() => ({
  mockRequireUser: vi.fn(),
  mockParsePositiveBigIntParam: vi.fn(),
  mockDismissAlert: vi.fn(),
  mockSerialize: vi.fn(),
  mockLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}))

vi.mock('~/server/utils/auth', () => ({ requireUser: mockRequireUser }))
vi.mock('~/server/utils/validation', () => ({ parsePositiveBigIntParam: mockParsePositiveBigIntParam }))
vi.mock('~/server/utils/alert-queries', () => ({ dismissAlert: mockDismissAlert }))
vi.mock('~/server/utils/serialize', () => ({ serialize: mockSerialize }))
vi.mock('~/server/utils/error-handler', () => ({ handleApiError: vi.fn() }))
vi.mock('~/lib/logger', () => ({
  logger: { alert: { withRequestId: vi.fn(() => mockLogger) } },
}))

import handler from '~/server/api/alerts/[id]/dismiss.put'

describe('PUT /api/alerts/:id/dismiss', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '7' })
    mockParsePositiveBigIntParam.mockReturnValue(42n)
    mockDismissAlert.mockResolvedValue({ id: 42n, isDismissed: true })
    mockSerialize.mockImplementation(value => value)
  })

  it('delegates dismiss ownership to the shared alert module', async () => {
    await handler({ context: { requestId: 'req-alert-dismiss' } } as any)

    expect(mockDismissAlert).toHaveBeenCalledWith(42n, 7n)
    expect(mockSerialize).toHaveBeenCalledWith({ id: 42n, isDismissed: true })
  })
})
