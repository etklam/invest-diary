import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

// ── Prisma mock ───────────────────────────────────────────────────────
const mockEtfAlertFindMany = vi.fn()
const mockEtfAlertCreate = vi.fn()
const mockEtfAlertFindUnique = vi.fn()
const mockEtfAlertDelete = vi.fn()
const mockEtfFindUnique = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    etfAlert: {
      findMany: mockEtfAlertFindMany,
      create: mockEtfAlertCreate,
      findUnique: mockEtfAlertFindUnique,
      delete: mockEtfAlertDelete,
    },
    etf: {
      findUnique: mockEtfFindUnique,
    },
  },
}))

// ── Auth mock ─────────────────────────────────────────────────────────
const mockRequireUser = vi.fn()
vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

// ── Validation mock ───────────────────────────────────────────────────
const mockParsePositiveBigIntParam = vi.fn()
vi.mock('~/server/utils/validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/validation')>()
  return {
    ...actual,
    parsePositiveBigIntParam: mockParsePositiveBigIntParam,
  }
})

// ── Logger mock ───────────────────────────────────────────────────────
const mockEtfLog = { info: vi.fn(), error: vi.fn() }
vi.mock('~/lib/logger', () => ({
  logger: {
    etf: { withRequestId: vi.fn(() => mockEtfLog) },
  },
}))

// ── Helpers ───────────────────────────────────────────────────────────
function makeAlert(overrides: {
  id?: bigint
  type?: string
  threshold?: number
  message?: string
  isTriggered?: boolean
  triggeredAt?: Date | null
  createdAt?: Date
  symbol?: string
  name?: string
}) {
  return {
    id: overrides.id ?? 1n,
    type: overrides.type ?? 'PRICE_ABOVE',
    threshold: { valueOf: () => String(overrides.threshold ?? 100) },
    message: overrides.message ?? 'PRICE_ABOVE alert for SPY at 100',
    isTriggered: overrides.isTriggered ?? false,
    triggeredAt: overrides.triggeredAt ?? null,
    createdAt: overrides.createdAt ?? new Date('2026-05-01T00:00:00.000Z'),
    etf: {
      symbol: overrides.symbol ?? 'SPY',
      name: overrides.name ?? 'SPDR S&P 500 ETF',
    },
  }
}

// ── Tests ─────────────────────────────────────────────────────────────
describe('ETF alert routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1' })
    mockReadBody.mockReset()
  })

  // ── GET /api/etf/alerts ──────────────────────────────────────────
  describe('GET /api/etf/alerts', () => {
    it('returns only the authenticated user alerts', async () => {
      mockEtfAlertFindMany.mockResolvedValue([
        makeAlert({ id: 1n, type: 'PRICE_ABOVE', threshold: 450 }),
        makeAlert({ id: 2n, type: 'PRICE_BELOW', threshold: 400, symbol: 'QQQ', name: 'Invesco QQQ' }),
      ])

      const { default: handler } = await import('~/server/api/etf/alerts/index.get')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

      expect(mockEtfAlertFindMany).toHaveBeenCalledWith(expect.objectContaining({
        where: { userId: '1' },
        orderBy: { createdAt: 'desc' },
      }))
      expect(result).toHaveLength(2)
      expect(result[0]).toMatchObject({
        id: '1',
        symbol: 'SPY',
        type: 'PRICE_ABOVE',
        threshold: 100,
        isTriggered: false,
      })
      expect(result[1]).toMatchObject({
        id: '2',
        symbol: 'QQQ',
        type: 'PRICE_BELOW',
        threshold: 400,
      })
    })

    it('returns empty array when user has no alerts', async () => {
      mockEtfAlertFindMany.mockResolvedValue([])

      const { default: handler } = await import('~/server/api/etf/alerts/index.get')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-2' } } as any)

      expect(result).toEqual([])
    })

    it('rejects unauthenticated access with 401', async () => {
      vi.resetModules()
      const { default: handler } = await import('~/server/api/etf/alerts/index.get')
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })
  })

  // ── POST /api/etf/alerts ─────────────────────────────────────────
  describe('POST /api/etf/alerts', () => {
    it('creates alert with valid data', async () => {
      mockReadBody.mockResolvedValue({
        symbol: 'SPY',
        type: 'PRICE_ABOVE',
        threshold: 450,
        message: 'SPY breakout alert',
      })
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPDR S&P 500 ETF' })
      mockEtfAlertCreate.mockResolvedValue({
        id: 42n,
        type: 'PRICE_ABOVE',
        threshold: { valueOf: () => '450' },
        message: 'SPY breakout alert',
        isTriggered: false,
      })

      const { default: handler } = await import('~/server/api/etf/alerts/index.post')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

      expect(mockEtfFindUnique).toHaveBeenCalledWith({ where: { symbol: 'SPY' } })
      expect(mockEtfAlertCreate).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          userId: '1',
          etfId: 10n,
          type: 'PRICE_ABOVE',
          threshold: '450',
          message: 'SPY breakout alert',
        }),
      }))
      expect(result).toMatchObject({
        id: '42',
        symbol: 'SPY',
        type: 'PRICE_ABOVE',
        threshold: 450,
        message: 'SPY breakout alert',
        isTriggered: false,
      })
    })

    it('generates default message when message is not provided', async () => {
      mockReadBody.mockResolvedValue({ symbol: 'QQQ', type: 'PRICE_BELOW', threshold: 300 })
      mockEtfFindUnique.mockResolvedValue({ id: 20n, symbol: 'QQQ', name: 'Invesco QQQ' })
      mockEtfAlertCreate.mockResolvedValue({
        id: 43n,
        type: 'PRICE_BELOW',
        threshold: { valueOf: () => '300' },
        message: 'PRICE_BELOW alert for QQQ at 300',
        isTriggered: false,
      })

      const { default: handler } = await import('~/server/api/etf/alerts/index.post')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-2' } } as any)

      expect(result.message).toBe('PRICE_BELOW alert for QQQ at 300')
    })

    it('normalizes symbol to uppercase', async () => {
      mockReadBody.mockResolvedValue({ symbol: '  spy  ', type: 'MOVING_AVG', threshold: 200 })
      mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPDR S&P 500 ETF' })
      mockEtfAlertCreate.mockResolvedValue({
        id: 44n,
        type: 'MOVING_AVG',
        threshold: { valueOf: () => '200' },
        message: 'MOVING_AVG alert for SPY at 200',
        isTriggered: false,
      })

      const { default: handler } = await import('~/server/api/etf/alerts/index.post')
      await handler({ context: { user: { id: '1' }, requestId: 'req-3' } } as any)

      expect(mockEtfFindUnique).toHaveBeenCalledWith({ where: { symbol: 'SPY' } })
    })

    it('returns 400 when required fields are missing', async () => {
      mockReadBody.mockResolvedValue({ type: 'PRICE_ABOVE' })

      const { default: handler } = await import('~/server/api/etf/alerts/index.post')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-4' } } as any))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('returns 400 when threshold is missing (undefined)', async () => {
      mockReadBody.mockResolvedValue({ symbol: 'SPY', type: 'PRICE_ABOVE' })

      const { default: handler } = await import('~/server/api/etf/alerts/index.post')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-5' } } as any))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('returns 400 for invalid alert type', async () => {
      mockReadBody.mockResolvedValue({ symbol: 'SPY', type: 'INVALID_TYPE', threshold: 100 })

      const { default: handler } = await import('~/server/api/etf/alerts/index.post')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-6' } } as any))
        .rejects.toMatchObject({ statusCode: 400 })
    })

    it('returns 404 when ETF does not exist', async () => {
      mockReadBody.mockResolvedValue({ symbol: 'NONEXIST', type: 'PRICE_ABOVE', threshold: 100 })
      mockEtfFindUnique.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/etf/alerts/index.post')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-7' } } as any))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('rejects unauthenticated access with 401', async () => {
      vi.resetModules()
      const { default: handler } = await import('~/server/api/etf/alerts/index.post')
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })

    it.each(['PRICE_ABOVE', 'PRICE_BELOW', 'CHANGE_PERCENT', 'MOVING_AVG'] as const)(
      'accepts valid alert type: %s',
      async (type) => {
        mockReadBody.mockResolvedValue({ symbol: 'SPY', type, threshold: 100 })
        mockEtfFindUnique.mockResolvedValue({ id: 10n, symbol: 'SPY', name: 'SPDR S&P 500 ETF' })
        mockEtfAlertCreate.mockResolvedValue({
          id: 50n,
          type,
          threshold: { valueOf: () => '100' },
          message: `${type} alert for SPY at 100`,
          isTriggered: false,
        })

        const { default: handler } = await import('~/server/api/etf/alerts/index.post')
        const result = await handler({ context: { user: { id: '1' }, requestId: 'req-type' } } as any)

        expect(result.type).toBe(type)
        expect(result.threshold).toBe(100)
      },
    )
  })

  // ── DELETE /api/etf/alerts/:id ───────────────────────────────────
  describe('DELETE /api/etf/alerts/:id', () => {
    it('deletes alert owned by the authenticated user', async () => {
      mockParsePositiveBigIntParam.mockReturnValue(42n)
      mockEtfAlertFindUnique.mockResolvedValue({ id: 42n, userId: 1n })
      mockEtfAlertDelete.mockResolvedValue({ id: 42n })

      const { default: handler } = await import('~/server/api/etf/alerts/[id].delete')
      const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

      expect(mockParsePositiveBigIntParam).toHaveBeenCalledWith(expect.any(Object), 'id')
      expect(mockEtfAlertDelete).toHaveBeenCalledWith({ where: { id: 42n } })
      expect(result).toEqual({ success: true })
    })

    it('returns 404 when alert does not exist', async () => {
      mockParsePositiveBigIntParam.mockReturnValue(99n)
      mockEtfAlertFindUnique.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/etf/alerts/[id].delete')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-2' } } as any))
        .rejects.toMatchObject({ statusCode: 404 })
    })

    it('returns 403 when alert belongs to another user', async () => {
      mockParsePositiveBigIntParam.mockReturnValue(42n)
      mockEtfAlertFindUnique.mockResolvedValue({ id: 42n, userId: 2n })

      const { default: handler } = await import('~/server/api/etf/alerts/[id].delete')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-3' } } as any))
        .rejects.toMatchObject({ statusCode: 403 })
    })

    it('returns 403 when alert userId is string but does not match', async () => {
      // String comparison: String(alert.userId) !== String(user.id)
      mockParsePositiveBigIntParam.mockReturnValue(42n)
      mockEtfAlertFindUnique.mockResolvedValue({ id: 42n, userId: 999n })

      const { default: handler } = await import('~/server/api/etf/alerts/[id].delete')
      await expect(handler({ context: { user: { id: '1' }, requestId: 'req-4' } } as any))
        .rejects.toMatchObject({ statusCode: 403 })
    })

    it('rejects unauthenticated access with 401', async () => {
      vi.resetModules()
      const { default: handler } = await import('~/server/api/etf/alerts/[id].delete')
      await expect(handler({ context: {} } as any)).rejects.toMatchObject({ statusCode: 401 })
    })
  })
})
