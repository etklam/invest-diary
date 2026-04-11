import { describe, it, expect, vi, beforeEach } from 'vitest'

// ─── Prisma mock ──────────────────────────────────────────────────────────────

const mockDiaryFindFirst = vi.fn()
const mockDisciplineCheckCreateMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: { findFirst: mockDiaryFindFirst },
    disciplineCheck: { createMany: mockDisciplineCheckCreateMany },
  },
}))

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('POST /api/discipline/check', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('未認證 → 401', async () => {
    vi.resetModules()
    const { default: handler } = await import('~/server/api/discipline/check.post')
    await expect(
      handler({ context: {}, req: {} } as any),
    ).rejects.toMatchObject({ statusCode: 401 })
  })

  it('缺少 checks → 400', async () => {
    vi.resetModules()
    const { default: handler } = await import('~/server/api/discipline/check.post')
    await expect(
      handler({
        context: { user: { id: '1' }, requestId: 'req-1' },
        req: {},
      } as any),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('空的 checks 陣列 → 400', async () => {
    global.readBody = vi.fn().mockResolvedValue({ checks: [] })

    vi.resetModules()
    const { default: handler } = await import('~/server/api/discipline/check.post')
    await expect(
      handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any),
    ).rejects.toMatchObject({ statusCode: 400 })
  })

  it('正常提交 checks（不帶 diaryId）→ 建立記錄', async () => {
    global.readBody = vi.fn().mockResolvedValue({
      checks: [
        { disciplineId: '42', passed: true },
        { disciplineId: null, passed: false },
      ],
      note: '今天有點 FOMO',
    })
    mockDisciplineCheckCreateMany.mockResolvedValue({ count: 2 })

    vi.resetModules()
    const { default: handler } = await import('~/server/api/discipline/check.post')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.created).toBe(2)
    expect(mockDisciplineCheckCreateMany).toHaveBeenCalledTimes(1)
    expect(mockDiaryFindFirst).not.toHaveBeenCalled() // 沒有 diaryId，不查 diary
  })

  it('帶有 diaryId 且日記存在 → 成功', async () => {
    global.readBody = vi.fn().mockResolvedValue({
      diaryId: '10',
      checks: [{ disciplineId: '42', passed: true }],
    })
    mockDiaryFindFirst.mockResolvedValue({ id: 10n })
    mockDisciplineCheckCreateMany.mockResolvedValue({ count: 1 })

    vi.resetModules()
    const { default: handler } = await import('~/server/api/discipline/check.post')
    const result = await handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any)

    expect(result.created).toBe(1)
    expect(mockDiaryFindFirst).toHaveBeenCalledTimes(1)
  })

  it('帶有 diaryId 但日記不屬於此用戶 → 403', async () => {
    global.readBody = vi.fn().mockResolvedValue({
      diaryId: '999',
      checks: [{ disciplineId: null, passed: true }],
    })
    mockDiaryFindFirst.mockResolvedValue(null) // 找不到日記

    vi.resetModules()
    const { default: handler } = await import('~/server/api/discipline/check.post')
    await expect(
      handler({ context: { user: { id: '1' }, requestId: 'req-1' } } as any),
    ).rejects.toMatchObject({ statusCode: 403 })
  })
})
