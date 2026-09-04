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

  it('dispatches a validated scope to the shared batch seam', async () => {
    mockReadBody.mockResolvedValue({ scope: 'sectors' })
    mockRunScopeBatch.mockResolvedValue({
      rankScope: 'sectors',
      upsertedCount: 2,
      errors: [],
    })

    const { default: handler } = await import('~/server/api/admin/market/rotation-batch.post')

    await expect(handler({ context: { requestId: 'req-sectors' } } as any)).resolves.toEqual({
      success: true,
      result: {
        rankScope: 'sectors',
        upsertedCount: 2,
        errors: [],
      },
    })
    expect(mockRunScopeBatch).toHaveBeenCalledWith({}, 'sectors')
    expect(mockRunFullBatch).not.toHaveBeenCalled()
  })

  it('dispatches an omitted scope to the full shared batch seam', async () => {
    mockReadBody.mockResolvedValue({})
    mockRunFullBatch.mockResolvedValue({
      rankScope: 'all',
      upsertedCount: 23,
      errors: [],
    })

    const { default: handler } = await import('~/server/api/admin/market/rotation-batch.post')

    await expect(handler({ context: { requestId: 'req-all' } } as any)).resolves.toEqual({
      success: true,
      rankScope: 'all',
      upsertedCount: 23,
      errors: [],
    })
    expect(mockRunFullBatch).toHaveBeenCalledWith({})
    expect(mockRunScopeBatch).not.toHaveBeenCalled()
  })
})
