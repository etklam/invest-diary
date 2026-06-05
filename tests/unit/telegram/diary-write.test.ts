import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createBuySellDiary, createNoteDiary } from '~/lib/telegram/diary-write'

const mockCreateDiaryForUser = vi.hoisted(() => vi.fn())
const mockFindUser = vi.hoisted(() => vi.fn())

vi.mock('~/server/utils/diary-write', () => ({
  createDiaryForUser: mockCreateDiaryForUser,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    user: {
      findUnique: mockFindUser,
    },
  },
}))

vi.mock('~/lib/logger', () => ({
  logger: {
    telegram: {
      error: vi.fn(),
    },
  },
}))

describe('Telegram diary write', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockFindUser.mockResolvedValue({ timezone: 'Asia/Taipei' })
  })

  it('rethrows note DB failure after replying so webhook can release the update', async () => {
    const error = new Error('DB unavailable')
    mockCreateDiaryForUser.mockRejectedValue(error)
    const ctx = {
      t: (key: string) => key,
      reply: vi.fn().mockResolvedValue(undefined),
    }

    await expect(createNoteDiary(ctx, BigInt(1), 'memo')).rejects.toBe(error)
    expect(ctx.reply).toHaveBeenCalledWith('telegram.errors.dbWriteFailed')
  })

  it('rethrows buy/sell DB failure after replying so webhook can release the update', async () => {
    const error = new Error('DB unavailable')
    mockCreateDiaryForUser.mockRejectedValue(error)
    const ctx = {
      t: (key: string) => key,
      reply: vi.fn().mockResolvedValue(undefined),
    }

    await expect(createBuySellDiary(ctx, BigInt(1), 'AAPL', 2, 100, 'BUY')).rejects.toBe(error)
    expect(ctx.reply).toHaveBeenCalledWith('telegram.errors.dbWriteFailed')
  })
})
