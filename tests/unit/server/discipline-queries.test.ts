/**
 * Unit tests for discipline-queries — query layer + Zod validation.
 *
 * Mirrors the structure of price-alert-queries.test.ts.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks ---
const {
  mockDisciplineFindMany,
  mockDisciplineFindFirst,
  mockDisciplineCreate,
  mockDisciplineUpdate,
  mockDisciplineDelete,
  mockDisciplineDeleteMany,
  mockDisciplineCreateMany,
  mockDisciplineUpdateMany,
  mockPrismaTransaction,
  mockUserFindUnique,
} = vi.hoisted(() => ({
  mockDisciplineFindMany: vi.fn(),
  mockDisciplineFindFirst: vi.fn(),
  mockDisciplineCreate: vi.fn(),
  mockDisciplineUpdate: vi.fn(),
  mockDisciplineDelete: vi.fn(),
  mockDisciplineDeleteMany: vi.fn(),
  mockDisciplineCreateMany: vi.fn(),
  mockDisciplineUpdateMany: vi.fn(),
  mockPrismaTransaction: vi.fn(),
  mockUserFindUnique: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    discipline: {
      findMany: mockDisciplineFindMany,
      findFirst: mockDisciplineFindFirst,
      create: mockDisciplineCreate,
      update: mockDisciplineUpdate,
      delete: mockDisciplineDelete,
      deleteMany: mockDisciplineDeleteMany,
      createMany: mockDisciplineCreateMany,
      updateMany: mockDisciplineUpdateMany,
    },
    user: {
      findUnique: mockUserFindUnique,
    },
    $transaction: mockPrismaTransaction,
  },
}))

// --- Import SUT after mocks ---
import {
  listDisciplines,
  createDiscipline,
  updateDiscipline,
  deleteDiscipline,
  reorderDisciplines,
  getRandomDiscipline,
  importDisciplines,
  exportDisciplinesRaw,
  CreateDisciplineSchema,
  UpdateDisciplineSchema,
  ReorderDisciplineSchema,
  ImportDisciplineSchema,
} from '~/server/utils/discipline-queries'

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const USER_ID = 1n
const OTHER_USER_ID = 999n
const DISCIPLINE_ID = 42n

const mockDiscipline = {
  id: DISCIPLINE_ID,
  userId: USER_ID,
  content: '永遠設好止損',
  order: 0,
  createdAt: new Date('2026-01-15T10:00:00Z'),
}

const mockDisciplineList = [
  mockDiscipline,
  {
    id: 43n,
    userId: USER_ID,
    content: '不追高殺低',
    order: 1,
    createdAt: new Date('2026-01-16T10:00:00Z'),
  },
  {
    id: 44n,
    userId: USER_ID,
    content: '嚴守紀律',
    order: 2,
    createdAt: new Date('2026-01-17T10:00:00Z'),
  },
]

describe('discipline-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ─── listDisciplines ───────────────────────────────────────────────────
  describe('listDisciplines', () => {
    it('calls prisma.discipline.findMany with correct where and orderBy', async () => {
      mockDisciplineFindMany.mockResolvedValue(mockDisciplineList)

      const result = await listDisciplines(USER_ID)

      expect(mockDisciplineFindMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          content: true,
          order: true,
          createdAt: true,
        },
      })
      expect(result).toHaveLength(3)
    })

    it('returns empty array when user has no disciplines', async () => {
      mockDisciplineFindMany.mockResolvedValue([])

      const result = await listDisciplines(USER_ID)

      expect(result).toEqual([])
    })

    it('only returns disciplines for the specified user', async () => {
      mockDisciplineFindMany.mockResolvedValue(mockDisciplineList)

      await listDisciplines(USER_ID)

      expect(mockDisciplineFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: USER_ID },
        }),
      )
    })
  })

  // ─── createDiscipline ──────────────────────────────────────────────────
  describe('createDiscipline', () => {
    it('creates discipline with valid input and auto-assigns order', async () => {
      mockDisciplineFindFirst.mockResolvedValue({ order: 2 })
      mockDisciplineCreate.mockResolvedValue(mockDiscipline)

      const result = await createDiscipline(USER_ID, { content: '永遠設好止損' })

      expect(mockDisciplineFindFirst).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { order: 'desc' },
        select: { order: true },
      })
      expect(mockDisciplineCreate).toHaveBeenCalledWith({
        data: {
          content: '永遠設好止損',
          userId: USER_ID,
          order: 3,
        },
        select: {
          id: true,
          content: true,
          order: true,
          createdAt: true,
        },
      })
      expect(result).toEqual(mockDiscipline)
    })

    it('assigns order 0 when user has no existing disciplines', async () => {
      mockDisciplineFindFirst.mockResolvedValue(null)
      mockDisciplineCreate.mockResolvedValue(mockDiscipline)

      await createDiscipline(USER_ID, { content: '第一條紀律' })

      expect(mockDisciplineCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ order: 0 }),
        }),
      )
    })

    it('trims whitespace from content', async () => {
      mockDisciplineFindFirst.mockResolvedValue(null)
      mockDisciplineCreate.mockResolvedValue(mockDiscipline)

      await createDiscipline(USER_ID, { content: '  有空白  ' })

      expect(mockDisciplineCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ content: '有空白' }),
        }),
      )
    })

    it('throws ZodError when content is missing', async () => {
      await expect(createDiscipline(USER_ID, {})).rejects.toThrow()
    })

    it('throws ZodError when content is empty', async () => {
      await expect(createDiscipline(USER_ID, { content: '' })).rejects.toThrow()
    })

    it('throws ZodError when content is only whitespace', async () => {
      await expect(createDiscipline(USER_ID, { content: '   ' })).rejects.toThrow()
    })

    it('throws ZodError when content exceeds 255 characters', async () => {
      await expect(
        createDiscipline(USER_ID, { content: 'a'.repeat(256) }),
      ).rejects.toThrow()
    })
  })

  // ─── updateDiscipline ──────────────────────────────────────────────────
  describe('updateDiscipline', () => {
    it('updates discipline when owned by user', async () => {
      mockDisciplineFindFirst.mockResolvedValue(mockDiscipline)
      mockDisciplineUpdate.mockResolvedValue({
        ...mockDiscipline,
        content: '更新後的紀律',
      })

      const result = await updateDiscipline(DISCIPLINE_ID, USER_ID, {
        content: '更新後的紀律',
      })

      expect(mockDisciplineFindFirst).toHaveBeenCalledWith({
        where: { id: DISCIPLINE_ID, userId: USER_ID },
      })
      expect(mockDisciplineUpdate).toHaveBeenCalledWith({
        where: { id: DISCIPLINE_ID },
        data: { content: '更新後的紀律' },
        select: {
          id: true,
          content: true,
          order: true,
          createdAt: true,
        },
      })
      expect(result.content).toBe('更新後的紀律')
    })

    it('trims whitespace from content on update', async () => {
      mockDisciplineFindFirst.mockResolvedValue(mockDiscipline)
      mockDisciplineUpdate.mockResolvedValue(mockDiscipline)

      await updateDiscipline(DISCIPLINE_ID, USER_ID, { content: '  有空白  ' })

      expect(mockDisciplineUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { content: '有空白' },
        }),
      )
    })

    it('accepts string disciplineId and converts to BigInt', async () => {
      mockDisciplineFindFirst.mockResolvedValue(mockDiscipline)
      mockDisciplineUpdate.mockResolvedValue(mockDiscipline)

      await updateDiscipline('42', USER_ID, { content: 'test' })

      expect(mockDisciplineFindFirst).toHaveBeenCalledWith({
        where: { id: 42n, userId: USER_ID },
      })
    })

    it('throws notFound when discipline does not exist', async () => {
      mockDisciplineFindFirst.mockResolvedValue(null)

      await expect(
        updateDiscipline(DISCIPLINE_ID, USER_ID, { content: 'test' }),
      ).rejects.toThrow(/not found/i)
    })

    it('throws notFound when discipline belongs to another user', async () => {
      // findFirst with { id, userId } won't match other-user rows, so returns null
      mockDisciplineFindFirst.mockResolvedValue(null)

      await expect(
        updateDiscipline(DISCIPLINE_ID, OTHER_USER_ID, { content: 'test' }),
      ).rejects.toThrow(/not found/i)
    })

    it('does not call update when ownership check fails', async () => {
      mockDisciplineFindFirst.mockResolvedValue(null)

      await expect(
        updateDiscipline(DISCIPLINE_ID, USER_ID, { content: 'test' }),
      ).rejects.toThrow()

      expect(mockDisciplineUpdate).not.toHaveBeenCalled()
    })

    it('throws ZodError when content is missing', async () => {
      await expect(
        updateDiscipline(DISCIPLINE_ID, USER_ID, {}),
      ).rejects.toThrow()
    })

    it('throws ZodError when content is empty', async () => {
      await expect(
        updateDiscipline(DISCIPLINE_ID, USER_ID, { content: '' }),
      ).rejects.toThrow()
    })
  })

  // ─── deleteDiscipline ──────────────────────────────────────────────────
  describe('deleteDiscipline', () => {
    it('deletes discipline when owned by user', async () => {
      mockDisciplineFindFirst.mockResolvedValue(mockDiscipline)
      mockDisciplineDelete.mockResolvedValue(mockDiscipline)

      await deleteDiscipline(DISCIPLINE_ID, USER_ID)

      expect(mockDisciplineFindFirst).toHaveBeenCalledWith({
        where: { id: DISCIPLINE_ID, userId: USER_ID },
      })
      expect(mockDisciplineDelete).toHaveBeenCalledWith({
        where: { id: DISCIPLINE_ID },
      })
    })

    it('accepts string disciplineId and converts to BigInt', async () => {
      mockDisciplineFindFirst.mockResolvedValue(mockDiscipline)
      mockDisciplineDelete.mockResolvedValue(mockDiscipline)

      await deleteDiscipline('42', USER_ID)

      expect(mockDisciplineFindFirst).toHaveBeenCalledWith({
        where: { id: 42n, userId: USER_ID },
      })
      expect(mockDisciplineDelete).toHaveBeenCalledWith({
        where: { id: 42n },
      })
    })

    it('throws notFound when discipline does not exist', async () => {
      mockDisciplineFindFirst.mockResolvedValue(null)

      await expect(
        deleteDiscipline(DISCIPLINE_ID, USER_ID),
      ).rejects.toThrow(/not found/i)
    })

    it('throws notFound when discipline belongs to another user', async () => {
      mockDisciplineFindFirst.mockResolvedValue(null)

      await expect(
        deleteDiscipline(DISCIPLINE_ID, OTHER_USER_ID),
      ).rejects.toThrow(/not found/i)
    })

    it('does not call delete when ownership check fails', async () => {
      mockDisciplineFindFirst.mockResolvedValue(null)

      await expect(
        deleteDiscipline(DISCIPLINE_ID, USER_ID),
      ).rejects.toThrow()

      expect(mockDisciplineDelete).not.toHaveBeenCalled()
    })
  })

  // ─── reorderDisciplines ────────────────────────────────────────────────
  describe('reorderDisciplines', () => {
    it('reorders disciplines successfully via transaction', async () => {
      const orders = [
        { id: 42, order: 2 },
        { id: 43, order: 0 },
        { id: 44, order: 1 },
      ]

      mockDisciplineFindMany.mockResolvedValue([
        { id: 42n },
        { id: 43n },
        { id: 44n },
      ])
      mockPrismaTransaction.mockResolvedValue([])
      mockDisciplineFindMany
        .mockResolvedValueOnce([{ id: 42n }, { id: 43n }, { id: 44n }])
        .mockResolvedValueOnce([
          { id: 43n, content: 'B', order: 0, createdAt: new Date() },
          { id: 44n, content: 'C', order: 1, createdAt: new Date() },
          { id: 42n, content: 'A', order: 2, createdAt: new Date() },
        ])

      const result = await reorderDisciplines(USER_ID, orders)

      expect(mockDisciplineFindMany).toHaveBeenCalledWith({
        where: {
          id: { in: [42n, 43n, 44n] },
          userId: USER_ID,
        },
        select: { id: true },
      })
      expect(mockPrismaTransaction).toHaveBeenCalled()
      expect(result).toHaveLength(3)
    })

    it('throws disciplineNotFound when not all IDs belong to user', async () => {
      const orders = [
        { id: 42, order: 0 },
        { id: 99, order: 1 }, // not owned
      ]

      mockDisciplineFindMany.mockResolvedValue([{ id: 42n }])

      try {
        await reorderDisciplines(USER_ID, orders)
        expect.fail('Should have thrown')
      } catch (error: any) {
        expect(error.statusCode).toBe(404)
        expect(error.data.code).toBe('DISCIPLINE_NOT_FOUND')
      }

      expect(mockPrismaTransaction).not.toHaveBeenCalled()
    })

    it('throws ZodError when orders is empty', async () => {
      await expect(
        reorderDisciplines(USER_ID, []),
      ).rejects.toThrow()
    })

    it('throws ZodError when orders is not an array-like', async () => {
      await expect(
        reorderDisciplines(USER_ID, null as any),
      ).rejects.toThrow()
    })

    it('throws ZodError when order item missing id', async () => {
      await expect(
        reorderDisciplines(USER_ID, [{ order: 0 } as any]),
      ).rejects.toThrow()
    })

    it('throws ZodError when order item missing order', async () => {
      await expect(
        reorderDisciplines(USER_ID, [{ id: 42 } as any]),
      ).rejects.toThrow()
    })
  })

  // ─── getRandomDiscipline ───────────────────────────────────────────────
  describe('getRandomDiscipline', () => {
    it('returns null when user has no disciplines', async () => {
      mockDisciplineFindMany.mockResolvedValue([])

      const result = await getRandomDiscipline(USER_ID)

      expect(result).toBeNull()
    })

    it('returns a discipline when user has data', async () => {
      mockDisciplineFindMany.mockResolvedValue(mockDisciplineList)

      const result = await getRandomDiscipline(USER_ID)

      expect(result).not.toBeNull()
      expect(mockDisciplineList).toContainEqual(result)
    })

    it('only selects content field', async () => {
      mockDisciplineFindMany.mockResolvedValue([
        { content: 'test' },
      ])

      await getRandomDiscipline(USER_ID)

      expect(mockDisciplineFindMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        select: { content: true },
      })
    })

    it('returns one of the available disciplines', async () => {
      const contents = ['A', 'B', 'C', 'D', 'E']
      mockDisciplineFindMany.mockResolvedValue(
        contents.map((c) => ({ content: c })),
      )

      // Run many times and verify result is always one of the valid contents
      const results = new Set<string>()
      for (let i = 0; i < 50; i++) {
        const r = await getRandomDiscipline(USER_ID)
        if (r) results.add(r.content)
      }

      // At least 2 distinct results (randomness sanity check)
      expect(results.size).toBeGreaterThan(1)
      for (const r of results) {
        expect(contents).toContain(r)
      }
    })
  })

  // ─── importDisciplines ─────────────────────────────────────────────────
  describe('importDisciplines', () => {
    it('imports disciplines with append mode (no replace)', async () => {
      const disciplines = [
        { content: '紀律一', order: 0 },
        { content: '紀律二', order: 1 },
      ]

      mockDisciplineFindFirst.mockResolvedValue({ order: 5 })
      mockDisciplineCreateMany.mockResolvedValue({ count: 2 })

      const result = await importDisciplines(USER_ID, {
        disciplines,
        replaceExisting: false,
      })

      expect(mockDisciplineDeleteMany).not.toHaveBeenCalled()
      expect(mockDisciplineCreateMany).toHaveBeenCalledWith({
        data: [
          { content: '紀律一', userId: USER_ID, order: 6 },
          { content: '紀律二', userId: USER_ID, order: 7 },
        ],
      })
      expect(result).toEqual({ count: 2 })
    })

    it('imports disciplines with replace mode (deletes existing first)', async () => {
      const disciplines = [
        { content: '新紀律一' },
        { content: '新紀律二' },
      ]

      mockDisciplineDeleteMany.mockResolvedValue({ count: 10 })
      mockDisciplineCreateMany.mockResolvedValue({ count: 2 })

      const result = await importDisciplines(USER_ID, {
        disciplines,
        replaceExisting: true,
      })

      expect(mockDisciplineDeleteMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
      })
      // Replace mode: start order from 0
      expect(mockDisciplineCreateMany).toHaveBeenCalledWith({
        data: [
          { content: '新紀律一', userId: USER_ID, order: 0 },
          { content: '新紀律二', userId: USER_ID, order: 1 },
        ],
      })
      expect(result).toEqual({ count: 2 })
    })

    it('starts from order 0 when user has no existing disciplines (append)', async () => {
      const disciplines = [{ content: '第一條' }]

      mockDisciplineFindFirst.mockResolvedValue(null)
      mockDisciplineCreateMany.mockResolvedValue({ count: 1 })

      await importDisciplines(USER_ID, {
        disciplines,
        replaceExisting: false,
      })

      expect(mockDisciplineCreateMany).toHaveBeenCalledWith({
        data: [{ content: '第一條', userId: USER_ID, order: 0 }],
      })
    })

    it('skips empty content disciplines during import', async () => {
      const disciplines = [
        { content: '有效紀律' },
        { content: '' },
        { content: '   ' },
        { content: '另一條有效' },
      ]

      mockDisciplineFindFirst.mockResolvedValue(null)
      mockDisciplineCreateMany.mockResolvedValue({ count: 2 })

      const result = await importDisciplines(USER_ID, {
        disciplines,
        replaceExisting: false,
      })

      expect(mockDisciplineCreateMany).toHaveBeenCalledWith({
        data: [
          { content: '有效紀律', userId: USER_ID, order: 0 },
          { content: '另一條有效', userId: USER_ID, order: 1 },
        ],
      })
      expect(result).toEqual({ count: 2 })
    })

    it('throws ZodError when disciplines is empty array', async () => {
      await expect(
        importDisciplines(USER_ID, { disciplines: [], replaceExisting: false }),
      ).rejects.toThrow()
    })
  })

  // ─── exportDisciplinesRaw ──────────────────────────────────────────────
  describe('exportDisciplinesRaw', () => {
    it('returns raw Prisma disciplines ordered by order asc', async () => {
      mockDisciplineFindMany.mockResolvedValue(mockDisciplineList)

      const result = await exportDisciplinesRaw(USER_ID)

      expect(mockDisciplineFindMany).toHaveBeenCalledWith({
        where: { userId: USER_ID },
        orderBy: { order: 'asc' },
      })
      expect(result).toHaveLength(3)
      // Returns raw Prisma result — BigInt NOT converted
      expect(typeof result[0].id).toBe('bigint')
    })

    it('returns empty array when user has no disciplines', async () => {
      mockDisciplineFindMany.mockResolvedValue([])

      const result = await exportDisciplinesRaw(USER_ID)

      expect(result).toEqual([])
    })
  })

  // ─── Zod Schema unit tests ─────────────────────────────────────────────
  describe('CreateDisciplineSchema', () => {
    it('accepts valid content', () => {
      const result = CreateDisciplineSchema.parse({ content: '停損至上' })
      expect(result.content).toBe('停損至上')
    })

    it('trims whitespace', () => {
      const result = CreateDisciplineSchema.parse({ content: '  停損至上  ' })
      expect(result.content).toBe('停損至上')
    })

    it('rejects empty content', () => {
      expect(() => CreateDisciplineSchema.parse({ content: '' })).toThrow()
    })

    it('rejects whitespace-only content', () => {
      expect(() => CreateDisciplineSchema.parse({ content: '   ' })).toThrow()
    })

    it('rejects missing content', () => {
      expect(() => CreateDisciplineSchema.parse({})).toThrow()
    })

    it('rejects content over 255 chars (VarChar limit)', () => {
      expect(() =>
        CreateDisciplineSchema.parse({ content: 'x'.repeat(256) }),
      ).toThrow()
    })

    it('accepts content of exactly 255 chars', () => {
      const result = CreateDisciplineSchema.parse({ content: 'x'.repeat(255) })
      expect(result.content).toHaveLength(255)
    })
  })

  describe('UpdateDisciplineSchema', () => {
    it('accepts valid content', () => {
      const result = UpdateDisciplineSchema.parse({ content: '更新內容' })
      expect(result.content).toBe('更新內容')
    })

    it('trims whitespace', () => {
      const result = UpdateDisciplineSchema.parse({ content: '  更新  ' })
      expect(result.content).toBe('更新')
    })

    it('rejects empty content', () => {
      expect(() => UpdateDisciplineSchema.parse({ content: '' })).toThrow()
    })

    it('rejects missing content field', () => {
      expect(() => UpdateDisciplineSchema.parse({})).toThrow()
    })

    it('rejects content over 255 chars', () => {
      expect(() =>
        UpdateDisciplineSchema.parse({ content: 'y'.repeat(256) }),
      ).toThrow()
    })
  })

  describe('ReorderDisciplineSchema', () => {
    it('accepts valid orders array', () => {
      const result = ReorderDisciplineSchema.parse([
        { id: 1, order: 0 },
        { id: 2, order: 1 },
      ])
      expect(result).toHaveLength(2)
    })

    it('accepts single-item array', () => {
      const result = ReorderDisciplineSchema.parse([{ id: 42, order: 0 }])
      expect(result).toHaveLength(1)
    })

    it('rejects empty array', () => {
      expect(() => ReorderDisciplineSchema.parse([])).toThrow()
    })

    it('rejects item without id', () => {
      expect(() =>
        ReorderDisciplineSchema.parse([{ order: 0 }]),
      ).toThrow()
    })

    it('rejects item without order', () => {
      expect(() =>
        ReorderDisciplineSchema.parse([{ id: 1 }]),
      ).toThrow()
    })

    it('rejects non-array input', () => {
      expect(() => ReorderDisciplineSchema.parse({})).toThrow()
    })
  })

  describe('ImportDisciplineSchema', () => {
    it('accepts valid disciplines array', () => {
      const result = ImportDisciplineSchema.parse({
        disciplines: [{ content: '一條紀律' }],
      })
      expect(result.disciplines).toHaveLength(1)
    })

    it('defaults replaceExisting to false', () => {
      const result = ImportDisciplineSchema.parse({
        disciplines: [{ content: '一條紀律' }],
      })
      expect(result.replaceExisting).toBe(false)
    })

    it('accepts replaceExisting true', () => {
      const result = ImportDisciplineSchema.parse({
        disciplines: [{ content: '一條紀律' }],
        replaceExisting: true,
      })
      expect(result.replaceExisting).toBe(true)
    })

    it('rejects empty disciplines array', () => {
      expect(() =>
        ImportDisciplineSchema.parse({ disciplines: [] }),
      ).toThrow()
    })

    it('rejects missing disciplines field', () => {
      expect(() => ImportDisciplineSchema.parse({})).toThrow()
    })

    it('filters out empty-content disciplines', () => {
      const result = ImportDisciplineSchema.parse({
        disciplines: [
          { content: '有效' },
          { content: '' },
          { content: '   ' },
        ],
      })
      expect(result.disciplines).toHaveLength(1)
      expect(result.disciplines[0].content).toBe('有效')
    })
  })
})
