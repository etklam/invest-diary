import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

const { mockRunScopeBatch, mockRunFullBatch, mockLog } = vi.hoisted(() => ({
  mockRunScopeBatch: vi.fn(),
  mockRunFullBatch: vi.fn(),
  mockLog: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('~/lib/prisma', () => ({ default: {} }))
vi.mock('~/lib/logger', () => ({
  logger: { admin: { withRequestId: vi.fn(() => mockLog) } },
}))
vi.mock('~/server/utils/market-rotation-batch', () => ({
  runScopeBatch: mockRunScopeBatch,
  runFullBatch: mockRunFullBatch,
}))

describe('admin market rotation batch API', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a 400 validation error for an invalid scope', async () => {
    mockReadBody.mockResolvedValue({ scope: 'not-a-scope' })

    const { default: handler } = await import('~/server/api/admin/market/rotation-batch.post')

    await expect(handler({ context: { requestId: 'req-invalid-scope' } } as any)).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mockRunScopeBatch).not.toHaveBeenCalled()
    expect(mockRunFullBatch).not.toHaveBeenCalled()
  })
})
