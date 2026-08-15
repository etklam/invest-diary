import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  upsertStockWatchlistItem: vi.fn(),
  recordCreate: vi.fn(),
  recordFindUnique: vi.fn(),
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    stockTimelineRecord: {
      create: mocks.recordCreate,
      findUnique: mocks.recordFindUnique,
    },
  },
}))

vi.mock('~/server/utils/stock-watchlist-queries', () => ({
  upsertStockWatchlistItem: mocks.upsertStockWatchlistItem,
}))

import { createStockTimelineRecordFromWeb } from '~/server/utils/stock-timeline-queries'

const baseInput = {
  summary: 'Rotation into energy names accelerating.',
  sourceType: 'MARKET_ROTATION',
  occurredAt: '2026-08-01T00:00:00.000Z',
  idempotencyKey: 'web-aapl-1',
}

describe('createStockTimelineRecordFromWeb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.upsertStockWatchlistItem.mockResolvedValue({ stock: { id: 2n, symbol: 'AAPL' } })
    mocks.recordCreate.mockResolvedValue({ id: 88n })
  })

  it('upserts the watchlist then creates the record with createdVia WEB', async () => {
    await createStockTimelineRecordFromWeb(7n, 'aapl', baseInput)

    expect(mocks.upsertStockWatchlistItem).toHaveBeenCalledWith({ userId: 7n, symbol: 'aapl' })
    expect(mocks.recordCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 7n,
          stockId: 2n,
          summary: 'Rotation into energy names accelerating.',
          sourceType: 'MARKET_ROTATION',
          idempotencyKey: 'web-aapl-1',
          occurredAt: new Date('2026-08-01T00:00:00.000Z'),
          createdVia: 'WEB',
        }),
        include: { stock: { select: { symbol: true } } },
      })
    )
  })

  it('creates even when the symbol was not on the watchlist (auto-upsert, no skip)', async () => {
    // The agent path skips non-WATCHING symbols; web capture must not.
    await createStockTimelineRecordFromWeb('7', 'MSFT', {
      ...baseInput,
      sourceType: 'SEC_FILING',
    })

    expect(mocks.upsertStockWatchlistItem).toHaveBeenCalledWith({ userId: 7n, symbol: 'MSFT' })
    expect(mocks.recordCreate).toHaveBeenCalledTimes(1)
  })

  it('derives an idempotencyKey when the client did not supply one', async () => {
    await createStockTimelineRecordFromWeb(7n, 'aapl', {
      summary: baseInput.summary,
      sourceType: baseInput.sourceType,
      occurredAt: baseInput.occurredAt,
    })

    const usedKey = mocks.recordCreate.mock.calls[0][0].data.idempotencyKey
    expect(typeof usedKey).toBe('string')
    expect(usedKey.length).toBeGreaterThanOrEqual(1)
  })

  it('returns the existing record on idempotencyKey double-submit instead of overwriting', async () => {
    mocks.recordCreate.mockRejectedValue(Object.assign(new Error('Unique constraint failed'), { code: 'P2002' }))
    mocks.recordFindUnique.mockResolvedValue({ id: 88n, summary: 'original' })

    const result = await createStockTimelineRecordFromWeb(7n, 'aapl', baseInput)

    expect(mocks.recordFindUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_stockId_idempotencyKey: { userId: 7n, stockId: 2n, idempotencyKey: 'web-aapl-1' },
        },
      })
    )
    expect(result).toEqual({ id: 88n, summary: 'original' })
  })

  it('rethrows non-unique-constraint failures', async () => {
    mocks.recordCreate.mockRejectedValue(new Error('connection lost'))

    await expect(createStockTimelineRecordFromWeb(7n, 'aapl', baseInput)).rejects.toThrow('connection lost')
    expect(mocks.recordFindUnique).not.toHaveBeenCalled()
  })

  it('takes ownership only from the caller userId, never from input', async () => {
    await createStockTimelineRecordFromWeb(9n, 'aapl', baseInput)

    expect(mocks.upsertStockWatchlistItem).toHaveBeenCalledWith(expect.objectContaining({ userId: 9n }))
    expect(mocks.recordCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: 9n }) })
    )
  })
})
