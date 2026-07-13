import { beforeEach, describe, expect, it, vi } from 'vitest'

// --- Hoisted mocks ---
const mockTransactionFindMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    transaction: {
      findMany: mockTransactionFindMany,
    },
  },
}))

describe('server/utils/trade-queries', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()
  })

  // ─── findUserRawTransactions ────────────────────────────────────────────

  describe('findUserRawTransactions', () => {
    it('uses diary.userId as the only ownership predicate with stable ordering', async () => {
      mockTransactionFindMany.mockResolvedValue([])

      const { findUserRawTransactions } = await import('~/server/utils/trade-queries')

      const userId = 42n
      await findUserRawTransactions(userId)

      expect(mockTransactionFindMany).toHaveBeenCalledTimes(1)
      expect(mockTransactionFindMany).toHaveBeenCalledWith({
        where: {
          diary: { userId },
        },
        select: {
          id: true,
          symbol: true,
          type: true,
          quantity: true,
          price: true,
          tradeDate: true,
        },
        orderBy: [{ tradeDate: 'asc' }, { id: 'asc' }],
      })
    })

    it('returns the raw Prisma result array', async () => {
      const fakeTxs = [
        {
          id: 1n,
          symbol: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 150.5,
          tradeDate: new Date('2026-01-15'),
        },
        {
          id: 2n,
          symbol: 'AAPL',
          type: 'SELL',
          quantity: 10,
          price: 160.0,
          tradeDate: new Date('2026-02-20'),
        },
      ]
      mockTransactionFindMany.mockResolvedValue(fakeTxs)

      const { findUserRawTransactions } = await import('~/server/utils/trade-queries')

      const result = await findUserRawTransactions(42n)

      expect(result).toEqual([
        {
          id: '1',
          symbol: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 150.5,
          tradeDate: new Date('2026-01-15'),
          strategy: null,
          emotion: null,
        },
        {
          id: '2',
          symbol: 'AAPL',
          type: 'SELL',
          quantity: 10,
          price: 160,
          tradeDate: new Date('2026-02-20'),
          strategy: null,
          emotion: null,
        },
      ])
      expect(result).toHaveLength(2)
    })

    it('returns empty array when user has no transactions', async () => {
      mockTransactionFindMany.mockResolvedValue([])

      const { findUserRawTransactions } = await import('~/server/utils/trade-queries')

      const result = await findUserRawTransactions(99n)

      expect(result).toEqual([])
    })

    it('adds symbol filter to WHERE when symbol option is provided', async () => {
      mockTransactionFindMany.mockResolvedValue([])

      const { findUserRawTransactions } = await import('~/server/utils/trade-queries')

      const userId = 42n
      await findUserRawTransactions(userId, { symbol: 'AAPL' })

      expect(mockTransactionFindMany).toHaveBeenCalledWith({
        where: {
          diary: { userId },
          symbol: 'AAPL',
        },
        select: {
          id: true,
          symbol: true,
          type: true,
          quantity: true,
          price: true,
          tradeDate: true,
        },
        orderBy: [{ tradeDate: 'asc' }, { id: 'asc' }],
      })
    })
  })

  // ─── prepareTransactionsForMatching ─────────────────────────────────────

  describe('prepareTransactionsForMatching', () => {
    it('converts BigInt id to string via .toString()', async () => {
      const { prepareTransactionsForMatching } = await import('~/server/utils/trade-queries')

      const rawTxs = [
        {
          id: 9007199254740991n,  // MAX_SAFE_INTEGER as BigInt
          symbol: 'TSLA',
          type: 'BUY',
          quantity: 5,
          price: 200.0,
          tradeDate: new Date('2026-03-01'),
        },
      ]

      const result = prepareTransactionsForMatching(rawTxs)

      expect(result[0].id).toBe('9007199254740991')
      expect(typeof result[0].id).toBe('string')
    })

    it('casts type field to BUY | SELL union', async () => {
      const { prepareTransactionsForMatching } = await import('~/server/utils/trade-queries')

      const rawTxs = [
        {
          id: 1n,
          symbol: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 150,
          tradeDate: new Date('2026-01-01'),
        },
        {
          id: 2n,
          symbol: 'MSFT',
          type: 'SELL',
          quantity: 5,
          price: 300,
          tradeDate: new Date('2026-01-02'),
        },
      ]

      const result = prepareTransactionsForMatching(rawTxs)

      // Verify type is preserved as string literal
      expect(result[0].type).toBe('BUY')
      expect(result[1].type).toBe('SELL')
    })

    it('preserves all other fields (symbol, quantity, price, tradeDate)', async () => {
      const { prepareTransactionsForMatching } = await import('~/server/utils/trade-queries')

      const tradeDate = new Date('2026-05-15T10:30:00.000Z')
      const rawTxs = [
        {
          id: 123n,
          symbol: 'NVDA',
          type: 'BUY',
          quantity: 25,
          price: 450.75,
          tradeDate,
        },
      ]

      const result = prepareTransactionsForMatching(rawTxs)

      expect(result[0]).toMatchObject({
        symbol: 'NVDA',
        quantity: 25,
        price: 450.75,
        tradeDate,
      })
    })

    it('handles multiple transactions with different BigInt ids', async () => {
      const { prepareTransactionsForMatching } = await import('~/server/utils/trade-queries')

      const rawTxs = [
        { id: 100n, symbol: 'A', type: 'BUY', quantity: 1, price: 10, tradeDate: new Date('2026-01-01') },
        { id: 200n, symbol: 'B', type: 'SELL', quantity: 2, price: 20, tradeDate: new Date('2026-01-02') },
        { id: 300n, symbol: 'C', type: 'BUY', quantity: 3, price: 30, tradeDate: new Date('2026-01-03') },
      ]

      const result = prepareTransactionsForMatching(rawTxs)

      expect(result).toHaveLength(3)
      expect(result.map(r => r.id)).toEqual(['100', '200', '300'])
    })

    it('returns empty array for empty input', async () => {
      const { prepareTransactionsForMatching } = await import('~/server/utils/trade-queries')

      const result = prepareTransactionsForMatching([])

      expect(result).toEqual([])
    })

    it('produces output compatible with matchTrades (RawTransaction type)', async () => {
      const { prepareTransactionsForMatching } = await import('~/server/utils/trade-queries')

      const rawTxs = [
        {
          id: 1n,
          symbol: 'AAPL',
          type: 'BUY',
          quantity: 10,
          price: 150.0,
          tradeDate: new Date('2026-01-15'),
        },
      ]

      const result = prepareTransactionsForMatching(rawTxs)
      const tx = result[0]

      // Verify all fields required by RawTransaction interface exist
      expect(tx).toHaveProperty('id')
      expect(tx).toHaveProperty('symbol')
      expect(tx).toHaveProperty('type')
      expect(tx).toHaveProperty('quantity')
      expect(tx).toHaveProperty('price')
      expect(tx).toHaveProperty('tradeDate')

      // id should be string (not bigint/number)
      expect(typeof tx.id).toBe('string')
    })
  })
})
