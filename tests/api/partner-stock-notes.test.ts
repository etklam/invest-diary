import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetQuery, mockReadBody } from '../vi-setup'

// ── Prisma mocks ──────────────────────────────────────────────────────────
const mockPartnerLinkFindUnique = vi.fn()
const mockPartnerLinkFindFirst = vi.fn()
const mockPartnerLinkUpdate = vi.fn()
const mockStockFindUnique = vi.fn()
const mockStockNoteFindMany = vi.fn()
const mockStockNoteCount = vi.fn()
const mockApiLogWarn = vi.fn()
const mockApiLogError = vi.fn()
const mockStocksLogError = vi.fn()
const mockApiWithRequestId = vi.fn(() => ({
  info: vi.fn(),
  warn: mockApiLogWarn,
  error: mockApiLogError,
}))
const mockStocksWithRequestId = vi.fn(() => ({
  info: vi.fn(),
  warn: vi.fn(),
  error: mockStocksLogError,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    partnerLink: {
      findUnique: mockPartnerLinkFindUnique,
      findFirst: mockPartnerLinkFindFirst,
      update: mockPartnerLinkUpdate,
    },
    stock: {
      findUnique: mockStockFindUnique,
    },
    stockNote: {
      findMany: mockStockNoteFindMany,
      count: mockStockNoteCount,
    },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    api: {
      withRequestId: mockApiWithRequestId,
    },
    stocks: {
      withRequestId: mockStocksWithRequestId,
    },
  },
}))

// ── Auth mock ──────────────────────────────────────────────────────────────
const mockRequireUser = vi.fn()
vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

// ── Validation mock ────────────────────────────────────────────────────────
const mockParsePositiveBigIntParam = vi.fn()
vi.mock('~/server/utils/validation', async (importOriginal) => {
  const actual = await importOriginal<typeof import('~/server/utils/validation')>()
  return {
    ...actual,
    parsePositiveBigIntParam: mockParsePositiveBigIntParam,
  }
})

// ── Helpers ────────────────────────────────────────────────────────────────
const currentUser = { id: '1', email: 'user@example.com', role: 'USER' }
const partnerUser = { id: '2', email: 'partner@example.com', name: 'Ana' }

function makeStockNote(overrides: Record<string, unknown> = {}) {
  return {
    id: overrides.id as bigint ?? 100n,
    title: (overrides.title as string) ?? 'Test Note',
    content: (overrides.content as string) ?? 'Test content',
    date: (overrides.date as Date) ?? new Date('2026-05-01T12:00:00.000Z'),
    createdVia: (overrides.createdVia as string) ?? 'USER',
    createdByLabel: (overrides.createdByLabel as string | null) ?? null,
    createdAt: (overrides.createdAt as Date) ?? new Date('2026-05-01T12:00:00.000Z'),
    updatedAt: (overrides.updatedAt as Date) ?? new Date('2026-05-01T12:00:00.000Z'),
    stock: {
      symbol: (overrides.symbol as string) ?? 'AAPL',
      name: (overrides.name as string | null) ?? 'Apple Inc.',
    },
  }
}

// ── Tests ──────────────────────────────────────────────────────────────────
describe('Partner Stock Notes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue(currentUser)
    mockReadBody.mockReset()
    mockGetQuery.mockReturnValue({})
    mockParsePositiveBigIntParam.mockReturnValue(1n)
  })

  // ── Sharing endpoint ──────────────────────────────────────────────────
  describe('PUT /api/partners/:id/sharing', () => {
    it('supports shareStockNotes field', async () => {
      mockReadBody.mockResolvedValue({ shareStockNotes: true })
      mockPartnerLinkFindUnique.mockResolvedValue({
        id: 1n,
        userAId: 1n,
        userBId: 2n,
        initiatedByUserId: 1n,
        acceptedAt: new Date('2026-01-01'),
        userASharesDiaries: false,
        userBSharesDiaries: false,
        userASharesStockNotes: false,
        userBSharesStockNotes: false,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        userA: { id: 1n, email: 'user@example.com', name: 'User' },
        userB: { id: 2n, email: 'partner@example.com', name: 'Ana' },
      })
      mockPartnerLinkUpdate.mockResolvedValue({
        id: 1n,
        userAId: 1n,
        userBId: 2n,
        initiatedByUserId: 1n,
        acceptedAt: new Date('2026-01-01'),
        userASharesDiaries: false,
        userBSharesDiaries: false,
        userASharesStockNotes: true,
        userBSharesStockNotes: false,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        userA: { id: 1n, email: 'user@example.com', name: 'User' },
        userB: { id: 2n, email: 'partner@example.com', name: 'Ana' },
      })

      const { default: handler } = await import('~/server/api/partners/[id]/sharing.put')

      const result = await handler({
        context: {
          user: currentUser,
          requestId: 'req-1',
        },
      } as any)

      expect(result.link.selfSharesStockNotes).toBe(true)
      expect(mockPartnerLinkUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userASharesStockNotes: true,
          }),
        }),
      )
    })

    it('supports both shareDiaries and shareStockNotes', async () => {
      mockReadBody.mockResolvedValue({ shareDiaries: true, shareStockNotes: true })
      mockPartnerLinkFindUnique.mockResolvedValue({
        id: 1n,
        userAId: 1n,
        userBId: 2n,
        initiatedByUserId: 1n,
        acceptedAt: new Date('2026-01-01'),
        userASharesDiaries: false,
        userBSharesDiaries: false,
        userASharesStockNotes: false,
        userBSharesStockNotes: false,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        userA: { id: 1n, email: 'user@example.com', name: 'User' },
        userB: { id: 2n, email: 'partner@example.com', name: 'Ana' },
      })
      mockPartnerLinkUpdate.mockResolvedValue({
        id: 1n,
        userAId: 1n,
        userBId: 2n,
        initiatedByUserId: 1n,
        acceptedAt: new Date('2026-01-01'),
        userASharesDiaries: true,
        userBSharesDiaries: false,
        userASharesStockNotes: true,
        userBSharesStockNotes: false,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        userA: { id: 1n, email: 'user@example.com', name: 'User' },
        userB: { id: 2n, email: 'partner@example.com', name: 'Ana' },
      })

      const { default: handler } = await import('~/server/api/partners/[id]/sharing.put')

      const result = await handler({
        context: {
          user: currentUser,
          requestId: 'req-2',
        },
      } as any)

      expect(result.link.selfSharesDiaries).toBe(true)
      expect(result.link.selfSharesStockNotes).toBe(true)
    })

    it('rejects empty body (400)', async () => {
      mockReadBody.mockResolvedValue({})

      const { default: handler } = await import('~/server/api/partners/[id]/sharing.put')

      await expect(handler({
        context: {
          user: currentUser,
          requestId: 'req-3',
        },
      } as any)).rejects.toMatchObject({
        statusCode: 400,
      })
    })
  })

  // ── Stock notes access with partner ───────────────────────────────────
  describe('GET /api/stocks/:symbol/notes with partnerId', () => {
    it('returns 403 when partner link is not accepted', async () => {
      mockGetQuery.mockReturnValue({ partnerId: '2', page: '1', limit: '20' })
      mockStockFindUnique.mockResolvedValue({ id: 10n })
      mockPartnerLinkFindFirst.mockResolvedValue({
        id: 1n,
        userAId: 1n,
        userBId: 2n,
        acceptedAt: null, // not accepted
      })

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')

      await expect(handler({
        context: {
          params: { symbol: 'AAPL' },
          user: currentUser,
          requestId: 'req-notes-1',
        },
      } as any)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('returns 403 when partner has not enabled stock notes sharing', async () => {
      mockGetQuery.mockReturnValue({ partnerId: '2', page: '1', limit: '20' })
      mockStockFindUnique.mockResolvedValue({ id: 10n })
      mockPartnerLinkFindFirst.mockResolvedValue({
        id: 1n,
        userAId: 1n,
        userBId: 2n,
        initiatedByUserId: 1n,
        acceptedAt: new Date('2026-01-01'),
        userASharesDiaries: true,
        userBSharesDiaries: true,
        userASharesStockNotes: false,
        userBSharesStockNotes: false,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        userA: { id: 1n, email: 'user@example.com', name: 'User' },
        userB: { id: 2n, email: 'partner@example.com', name: 'Ana' },
      })

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')

      await expect(handler({
        context: {
          params: { symbol: 'AAPL' },
          user: currentUser,
          requestId: 'req-notes-2',
        },
      } as any)).rejects.toMatchObject({
        statusCode: 403,
      })
    })

    it('can fetch partner notes when sharing is enabled', async () => {
      mockGetQuery.mockReturnValue({ partnerId: '2', page: '1', limit: '20' })
      mockStockFindUnique.mockResolvedValue({ id: 10n })
      mockPartnerLinkFindFirst.mockResolvedValue({
        id: 1n,
        userAId: 1n,
        userBId: 2n,
        initiatedByUserId: 1n,
        acceptedAt: new Date('2026-01-01'),
        userASharesDiaries: false,
        userBSharesDiaries: false,
        userASharesStockNotes: false,
        userBSharesStockNotes: true, // partner (userB) shares
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        userA: { id: 1n, email: 'user@example.com', name: 'User' },
        userB: { id: 2n, email: 'partner@example.com', name: 'Ana' },
      })
      mockStockNoteFindMany.mockResolvedValue([makeStockNote({ id: 200n, createdVia: 'AGENT' })])
      mockStockNoteCount.mockResolvedValue(1)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')

      const result = await handler({
        context: {
          params: { symbol: 'AAPL' },
          user: currentUser,
          requestId: 'req-notes-3',
        },
      } as any)

      expect(result.notes).toHaveLength(1)
      // Partner notes should be marked as not owned by viewer
      expect(result.notes[0].isOwnedByViewer).toBe(false)
    })

    it('partner notes have isOwnedByViewer=false', async () => {
      mockGetQuery.mockReturnValue({ partnerId: '2', page: '1', limit: '20' })
      mockStockFindUnique.mockResolvedValue({ id: 10n })
      mockPartnerLinkFindFirst.mockResolvedValue({
        id: 1n,
        userAId: 1n,
        userBId: 2n,
        initiatedByUserId: 1n,
        acceptedAt: new Date('2026-01-01'),
        userASharesDiaries: false,
        userBSharesDiaries: false,
        userASharesStockNotes: false,
        userBSharesStockNotes: true,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
        userA: { id: 1n, email: 'user@example.com', name: 'User' },
        userB: { id: 2n, email: 'partner@example.com', name: 'Ana' },
      })
      mockStockNoteFindMany.mockResolvedValue([
        makeStockNote({ id: 201n, createdVia: 'AGENT', createdByLabel: 'OpenClaw' }),
        makeStockNote({ id: 202n, createdVia: 'AGENT' }),
      ])
      mockStockNoteCount.mockResolvedValue(2)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')

      const result = await handler({
        context: {
          params: { symbol: 'AAPL' },
          user: currentUser,
          requestId: 'req-notes-4',
        },
      } as any)

      expect(result.notes).toHaveLength(2)
      expect(result.notes[0].isOwnedByViewer).toBe(false)
      expect(result.notes[1].isOwnedByViewer).toBe(false)
    })

    it('own notes (no partnerId) have isOwnedByViewer=true', async () => {
      mockGetQuery.mockReturnValue({ page: '1', limit: '20' })
      mockStockFindUnique.mockResolvedValue({ id: 10n })
      mockStockNoteFindMany.mockResolvedValue([makeStockNote({ id: 101n, createdVia: 'USER' })])
      mockStockNoteCount.mockResolvedValue(1)

      const { default: handler } = await import('~/server/api/stocks/[symbol]/notes/index.get')

      const result = await handler({
        context: {
          params: { symbol: 'AAPL' },
          user: currentUser,
          requestId: 'req-notes-5',
        },
      } as any)

      expect(result.notes).toHaveLength(1)
      expect(result.notes[0].isOwnedByViewer).toBe(true)
    })
  })
})
