import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Errors } from '~/lib/errors/factory'
import { mockGetRouterParam, mockReadBody } from '../vi-setup'

const {
  mockListAdminEtfs,
  mockCreateAdminEtf,
  mockDeleteAdminEtf,
  mockInitializeAdminEtf,
  mockSeedAdminEtfs,
  mockAdminLog,
} = vi.hoisted(() => ({
  mockListAdminEtfs: vi.fn(),
  mockCreateAdminEtf: vi.fn(),
  mockDeleteAdminEtf: vi.fn(),
  mockInitializeAdminEtf: vi.fn(),
  mockSeedAdminEtfs: vi.fn(),
  mockAdminLog: {
    warn: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    admin: { withRequestId: vi.fn(() => mockAdminLog) },
  },
}))

vi.mock('~/server/utils/etf-admin-queries', async () => {
  const { z } = await import('zod')
  return {
    AdminEtfCreateSchema: z.object({
      symbol: z.string()
        .trim()
        .min(1, 'Symbol is required')
        .max(20, 'Symbol must be at most 20 characters')
        .transform(value => value.toUpperCase()),
      name: z.union([
        z.string().trim().max(255),
        z.null(),
        z.undefined(),
      ]).transform(value => value || null),
      skipValidation: z.boolean().optional().default(false),
    }),
    listAdminEtfs: mockListAdminEtfs,
    createAdminEtf: mockCreateAdminEtf,
    deleteAdminEtf: mockDeleteAdminEtf,
    initializeAdminEtf: mockInitializeAdminEtf,
    seedAdminEtfs: mockSeedAdminEtfs,
  }
})

describe('admin ETF API handlers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockReadBody.mockResolvedValue({})
    mockGetRouterParam.mockReturnValue('7')
  })

  it('lists ETFs with the standard serialized response', async () => {
    mockListAdminEtfs.mockResolvedValue([{
      id: 7n,
      symbol: 'SPY',
      name: 'SPDR S&P 500 ETF Trust',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date('2026-01-02'),
      _count: { prices: 12, watchlists: 2 },
    }])

    const { default: handler } = await import('~/server/api/admin/etf/index.get')
    const result = await handler({ context: { requestId: 'req-list' } } as any)

    expect(result).toEqual([expect.objectContaining({ id: '7', symbol: 'SPY', priceCount: 12 })])
  })

  it('validates and normalizes create input before calling the query layer', async () => {
    mockReadBody.mockResolvedValue({ symbol: ' spy ', skipValidation: true })
    mockCreateAdminEtf.mockResolvedValue({
      id: 8n,
      symbol: 'SPY',
      name: null,
      createdAt: new Date('2026-01-03'),
    })

    const { default: handler } = await import('~/server/api/admin/etf/index.post')
    const result = await handler({ context: { requestId: 'req-create' } } as any)

    expect(mockCreateAdminEtf).toHaveBeenCalledWith({
      symbol: 'SPY',
      name: null,
      skipValidation: true,
    })
    expect(result).toEqual(expect.objectContaining({ id: '8', symbol: 'SPY' }))
  })

  it('returns 400 for an invalid create payload', async () => {
    mockReadBody.mockResolvedValue({ name: 'missing symbol' })

    const { default: handler } = await import('~/server/api/admin/etf/index.post')

    await expect(handler({ context: { requestId: 'req-invalid' } } as any)).rejects.toMatchObject({
      statusCode: 400,
    })
    expect(mockCreateAdminEtf).not.toHaveBeenCalled()
  })

  it('covers delete, initialize, and seed success paths', async () => {
    mockDeleteAdminEtf.mockResolvedValue({ deletedPrices: 3, deletedWatchlists: 1 })
    mockInitializeAdminEtf.mockResolvedValue({
      added: 60,
      total: 60,
      symbol: 'SPY',
      dateRange: { from: '2021-01-01', to: '2026-01-01' },
    })
    mockSeedAdminEtfs.mockResolvedValue({ added: 24, skipped: 0, total: 24 })

    const deleteHandler = (await import('~/server/api/admin/etf/[id].delete')).default
    const initializeHandler = (await import('~/server/api/admin/etf/[id]/initialize.post')).default
    const seedHandler = (await import('~/server/api/admin/etf/seed.post')).default

    await expect(deleteHandler({ context: { requestId: 'req-delete' } } as any)).resolves.toMatchObject({
      success: true,
      deletedPrices: 3,
    })
    await expect(initializeHandler({ context: { requestId: 'req-init' } } as any)).resolves.toMatchObject({
      success: true,
      added: 60,
    })
    await expect(seedHandler({ context: { requestId: 'req-seed' } } as any)).resolves.toMatchObject({
      success: true,
      total: 24,
    })
  })

  it('maps query-layer not-found errors to the standard 404 response', async () => {
    mockGetRouterParam.mockReturnValue('999')
    mockDeleteAdminEtf.mockRejectedValue(Errors.etfNotFound('999'))

    const { default: handler } = await import('~/server/api/admin/etf/[id].delete')

    await expect(handler({ context: { requestId: 'req-not-found' } } as any)).rejects.toMatchObject({
      statusCode: 404,
    })
  })

  it('maps query-layer rate limits to the standard 429 response', async () => {
    mockReadBody.mockResolvedValue({ symbol: 'SPY', skipValidation: true })
    mockCreateAdminEtf.mockRejectedValue(Errors.rateLimited())

    const { default: handler } = await import('~/server/api/admin/etf/index.post')

    await expect(handler({ context: { requestId: 'req-rate-limit' } } as any)).rejects.toMatchObject({
      statusCode: 429,
    })
  })
})
