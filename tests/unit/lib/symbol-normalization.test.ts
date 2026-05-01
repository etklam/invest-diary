import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDiaryFindFirst = vi.fn()
const mockDiaryCreate = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    diary: {
      findFirst: mockDiaryFindFirst,
      create: mockDiaryCreate,
    },
  },
}))

describe('createDiaryForUser symbol normalization', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockDiaryFindFirst.mockResolvedValue(null)
    mockDiaryCreate.mockResolvedValue({
      id: 1n,
      title: 'T',
      content: 'C',
      tagsString: null,
      transactions: [],
      alerts: [],
    })
  })

  it('normalizes lowercase symbol to uppercase on create', async () => {
    const { createDiaryForUser } = await import('~/server/utils/diary-write')

    await createDiaryForUser({
      userId: '1',
      body: {
        title: 'Trade',
        content: 'content',
        transactions: [{ symbol: 'aapl', type: 'BUY', quantity: 1, price: 10 }],
      } as any,
    })

    expect(mockDiaryCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        transactions: {
          create: [expect.objectContaining({ symbol: 'AAPL' })],
        },
      }),
    }))
  })

  it('currently rejects symbol with leading/trailing spaces at validation stage', async () => {
    const { createDiaryForUser } = await import('~/server/utils/diary-write')

    await expect(createDiaryForUser({
      userId: '1',
      body: {
        title: 'Trade',
        content: 'content',
        transactions: [{ symbol: '  msft  ', type: 'SELL', quantity: 2, price: 20 }],
      } as any,
    })).rejects.toMatchObject({ statusCode: 400 })
  })

  it('TODO: `.TW` suffix 與 trim-after-validate 行為待 Phase 5 symbol module 完成後補強', () => {
    expect(true).toBe(true)
  })
})
