/**
 * Smoke tests for discipline API handlers.
 *
 * These verify the handler <-> query layer integration is wired correctly.
 * Full query layer coverage is in tests/unit/server/discipline-queries.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockReadBody } from '../vi-setup'

const mockRequireUser = vi.fn()
const mockListDisciplines = vi.fn()
const mockCreateDiscipline = vi.fn()
const mockUpdateDiscipline = vi.fn()
const mockDeleteDiscipline = vi.fn()
const mockReorderDisciplines = vi.fn()
const mockGetRandomDiscipline = vi.fn()
const mockExportDisciplinesRaw = vi.fn()
const mockImportDisciplines = vi.fn()
const mockUserFindUnique = vi.fn()

const mockLogInstance = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}
const mockDisciplineWithRequestId = vi.fn(() => mockLogInstance)

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockUserFindUnique,
    },
  },
}))

vi.mock('~/server/utils/auth', () => ({
  requireUser: mockRequireUser,
}))

vi.mock('~/server/utils/discipline-queries', () => ({
  listDisciplines: mockListDisciplines,
  createDiscipline: (...args: any[]) => mockCreateDiscipline(...args),
  updateDiscipline: (...args: any[]) => mockUpdateDiscipline(...args),
  deleteDiscipline: (...args: any[]) => mockDeleteDiscipline(...args),
  reorderDisciplines: (...args: any[]) => mockReorderDisciplines(...args),
  getRandomDiscipline: (...args: any[]) => mockGetRandomDiscipline(...args),
  exportDisciplinesRaw: (...args: any[]) => mockExportDisciplinesRaw(...args),
  importDisciplines: (...args: any[]) => mockImportDisciplines(...args),
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    discipline: {
      withRequestId: mockDisciplineWithRequestId,
    },
  },
}))

describe('Discipline API smoke tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockRequireUser.mockReturnValue({ id: '1', email: 'test@test.com', role: 'user' })
  })

  // ─── GET /api/discipline ───────────────────────────────────────────────
  describe('GET /api/discipline (list)', () => {
    it('returns serialized list', async () => {
      mockListDisciplines.mockResolvedValue([
        { id: 1n, content: '紀律 A', order: 0, createdAt: new Date('2026-01-01') },
        { id: 2n, content: '紀律 B', order: 1, createdAt: new Date('2026-01-02') },
      ])

      const { default: handler } = await import('~/server/api/discipline.get')
      const result = await handler({ context: { requestId: 'r1' } } as any)

      expect(mockListDisciplines).toHaveBeenCalledWith(1n)
      // serialize converts BigInt -> string
      expect(result).toEqual([
        { id: '1', content: '紀律 A', order: 0, createdAt: new Date('2026-01-01') },
        { id: '2', content: '紀律 B', order: 1, createdAt: new Date('2026-01-02') },
      ])
    })
  })

  // ─── POST /api/discipline ──────────────────────────────────────────────
  describe('POST /api/discipline (create)', () => {
    it('creates discipline and returns serialized result', async () => {
      mockReadBody.mockResolvedValue({ content: '停損至上' })
      mockCreateDiscipline.mockResolvedValue({
        id: 42n,
        content: '停損至上',
        order: 0,
        createdAt: new Date('2026-06-14'),
      })

      const { default: handler } = await import('~/server/api/discipline.post')
      const result = await handler({ context: { requestId: 'r2' } } as any)

      expect(mockCreateDiscipline).toHaveBeenCalledWith(1n, { content: '停損至上' })
      expect(result).toEqual({
        id: '42',
        content: '停損至上',
        order: 0,
        createdAt: new Date('2026-06-14'),
      })
    })

    it('propagates ZodError as validation error when content missing', async () => {
      mockReadBody.mockResolvedValue({})
      const { ZodError } = await import('zod')
      mockCreateDiscipline.mockRejectedValue(new ZodError([
        { code: 'invalid_type', expected: 'string', received: 'undefined', path: ['content'], message: 'Required' },
      ]))

      const { default: handler } = await import('~/server/api/discipline.post')

      await expect(
        handler({ context: { requestId: 'r3' } } as any),
      ).rejects.toMatchObject({ statusCode: 400 })
    })
  })

  // ─── GET /api/discipline/random ────────────────────────────────────────
  describe('GET /api/discipline/random', () => {
    it('returns custom discipline when user has data', async () => {
      mockGetRandomDiscipline.mockResolvedValue({ content: '嚴守紀律' })

      const { default: handler } = await import('~/server/api/discipline/random.get')
      const result = await handler({ context: { requestId: 'r4' } } as any)

      expect(result).toEqual({ content: '嚴守紀律', isCustom: true })
    })

    it('returns default quote when user has no disciplines', async () => {
      mockGetRandomDiscipline.mockResolvedValue(null)

      const { default: handler } = await import('~/server/api/discipline/random.get')
      const result = await handler({ context: { requestId: 'r5' } } as any)

      expect(result.isCustom).toBe(false)
      expect(typeof result.content).toBe('string')
      expect(result.content.length).toBeGreaterThan(0)
    })
  })

  // ─── DELETE /api/discipline/[id] ───────────────────────────────────────
  describe('DELETE /api/discipline/[id]', () => {
    it('deletes successfully and returns success: true', async () => {
      mockDeleteDiscipline.mockResolvedValue(undefined)

      const { default: handler } = await import('~/server/api/discipline/[id].delete')
      const result = await handler({
        context: { requestId: 'r6', params: { id: '42' } },
        path: '/api/discipline/42',
      } as any)

      expect(mockDeleteDiscipline).toHaveBeenCalledWith(42n, 1n)
      expect(result).toEqual({ success: true })
    })
  })

  // ─── PATCH /api/discipline/reorder ─────────────────────────────────────
  describe('PATCH /api/discipline/reorder', () => {
    it('reorders and returns serialized list', async () => {
      mockReadBody.mockResolvedValue([
        { id: 1, order: 2 },
        { id: 2, order: 0 },
        { id: 3, order: 1 },
      ])
      mockReorderDisciplines.mockResolvedValue([
        { id: 2n, content: 'B', order: 0, createdAt: new Date() },
        { id: 3n, content: 'C', order: 1, createdAt: new Date() },
        { id: 1n, content: 'A', order: 2, createdAt: new Date() },
      ])

      const { default: handler } = await import('~/server/api/discipline/reorder.patch')
      const result = await handler({ context: { requestId: 'r7' } } as any)

      expect(mockReorderDisciplines).toHaveBeenCalledWith(1n, [
        { id: 1, order: 2 },
        { id: 2, order: 0 },
        { id: 3, order: 1 },
      ])
      expect(result).toHaveLength(3)
      expect(result[0].id).toBe('2') // BigInt serialized
    })
  })

  // ─── POST /api/discipline/import ───────────────────────────────────────
  describe('POST /api/discipline/import', () => {
    it('imports disciplines via query layer', async () => {
      const validJson = JSON.stringify({
        version: '1.0',
        type: 'trading-disciplines',
        disciplines: [{ content: '紀律一' }, { content: '紀律二' }],
      })
      mockReadBody.mockResolvedValue({ json: validJson, replaceExisting: false })
      mockImportDisciplines.mockResolvedValue({ count: 2 })

      const { default: handler } = await import('~/server/api/discipline/import.post')
      const result = await handler({ context: { requestId: 'r8' } } as any)

      expect(mockImportDisciplines).toHaveBeenCalledWith(
        1n,
        {
          disciplines: [
            { content: '紀律一' },
            { content: '紀律二' },
          ],
          replaceExisting: false,
        },
      )
      expect(result).toEqual({
        success: true,
        imported: 2,
        message: 'Successfully imported 2 disciplines',
      })
    })
  })
})
