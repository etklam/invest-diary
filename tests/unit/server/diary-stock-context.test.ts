import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Prisma } from '@prisma/client'
import {
  normalizeDiaryStockSymbols,
  replaceDiaryStockContexts,
  unionDiaryStockContexts,
} from '~/server/utils/diary-stock-context'

describe('Diary–Stock context', () => {
  const stockUpsert = vi.fn()
  const deleteMany = vi.fn()
  const createMany = vi.fn()
  const tx = {
    stock: { upsert: stockUpsert },
    diaryStock: { deleteMany, createMany },
  } as unknown as Prisma.TransactionClient

  beforeEach(() => {
    vi.clearAllMocks()
    stockUpsert.mockImplementation(({ where }: { where: { symbol: string } }) =>
      Promise.resolve({ id: BigInt(where.symbol.length) }))
    deleteMany.mockResolvedValue({ count: 0 })
    createMany.mockResolvedValue({ count: 1 })
  })

  it('normalizes and deduplicates explicit symbols', () => {
    expect(normalizeDiaryStockSymbols([' aapl ', 'AAPL', '0050.tw'])).toEqual(['AAPL', '0050.TW'])
    expect(() => normalizeDiaryStockSymbols('AAPL')).toThrow()
    expect(() => normalizeDiaryStockSymbols(Array.from({ length: 11 }, (_, index) => `S${index}`))).toThrow()
  })

  it('Quick Note append unions contexts and never removes prior links', async () => {
    await unionDiaryStockContexts(tx, 9n, ['AAPL'])

    expect(deleteMany).not.toHaveBeenCalled()
    expect(createMany).toHaveBeenCalledWith({
      data: [{ diaryId: 9n, stockId: 4n }],
      skipDuplicates: true,
    })
  })

  it('Full Diary edit explicitly replaces contexts, including clearing all', async () => {
    await replaceDiaryStockContexts(tx, 9n, [])

    expect(deleteMany).toHaveBeenCalledWith({ where: { diaryId: 9n } })
    expect(createMany).not.toHaveBeenCalled()
  })
})
