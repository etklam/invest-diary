import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockTransactionFindMany = vi.fn()

vi.mock('~/lib/prisma', () => ({
  default: {
    transaction: {
      findMany: mockTransactionFindMany,
    },
  },
}))

const BASE_SELECT = {
  id: true,
  symbol: true,
  type: true,
  quantity: true,
  price: true,
  tradeDate: true,
}

const STABLE_ORDER = [{ tradeDate: 'asc' }, { id: 'asc' }]

function decimal(value: number) {
  return { toNumber: () => value }
}

describe('server/utils/transaction-read', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads null/mismatch copy rows through diary ownership and maps scalar wrappers', async () => {
    mockTransactionFindMany.mockResolvedValue([
      {
        id: 20n,
        userId: null,
        symbol: ' aapl ',
        type: 'BUY',
        quantity: decimal(2.5),
        price: decimal(100),
        tradeDate: new Date('2026-01-01'),
      },
      {
        id: 21n,
        userId: 999n,
        symbol: 'AAPL',
        type: 'SELL',
        quantity: decimal(1),
        price: decimal(120),
        tradeDate: new Date('2026-01-02'),
      },
    ])

    const { readPortfolioTransactions } = await import('~/server/utils/transaction-read')
    const rows = await readPortfolioTransactions(7n)

    expect(rows).toMatchObject([
      { id: '20', symbol: 'AAPL', quantity: 2.5, price: 100 },
      { id: '21', symbol: 'AAPL', quantity: 1, price: 120 },
    ])
    expect(mockTransactionFindMany).toHaveBeenCalledWith({
      where: { diary: { userId: 7n } },
      select: BASE_SELECT,
      orderBy: STABLE_ORDER,
    })

    const query = mockTransactionFindMany.mock.calls[0][0]
    expect(query.where).not.toHaveProperty('OR')
    expect(query.where).not.toHaveProperty('userId')
    expect(query.select).not.toHaveProperty('userId')
  })

  it('keeps the Decimal receiver when calling toNumber', async () => {
    const quantity = {
      value: 2.5,
      toNumber(this: { value: number }) {
        return this.value
      },
    }
    const price = {
      value: 100,
      toNumber(this: { value: number }) {
        return this.value
      },
    }
    mockTransactionFindMany.mockResolvedValue([{
      id: 20n,
      symbol: 'AAPL',
      type: 'BUY',
      quantity,
      price,
      tradeDate: new Date('2026-01-01'),
    }])

    const { readPortfolioTransactions } = await import('~/server/utils/transaction-read')
    const rows = await readPortfolioTransactions(7n)

    expect(rows[0]).toMatchObject({ quantity: 2.5, price: 100 })
  })

  it('includes strategy/emotion when trade analytics attributes are requested', async () => {
    mockTransactionFindMany.mockResolvedValue([
      {
        id: 20n,
        symbol: 'AAPL',
        type: 'BUY',
        quantity: decimal(2.5),
        price: decimal(100),
        tradeDate: new Date('2026-01-01'),
        strategy: 'Breakout',
        emotion: 'calm',
      },
    ])

    const { readPortfolioTransactions } = await import('~/server/utils/transaction-read')
    const rows = await readPortfolioTransactions(7n, { withAttributes: true })

    expect(mockTransactionFindMany).toHaveBeenCalledWith({
      where: { diary: { userId: 7n } },
      select: { ...BASE_SELECT, strategy: true, emotion: true },
      orderBy: STABLE_ORDER,
    })
    expect(rows[0]).toMatchObject({ strategy: 'Breakout', emotion: 'calm' })
  })

  it('applies normalized symbol filter alongside ownership, never instead of ownership', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    const { readPortfolioTransactions } = await import('~/server/utils/transaction-read')
    await readPortfolioTransactions(7n, { symbol: ' aapl ' })

    expect(mockTransactionFindMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { diary: { userId: 7n }, symbol: 'AAPL' },
    }))
    const query = mockTransactionFindMany.mock.calls[0][0]
    expect(query.where).not.toHaveProperty('OR')
    expect(query.where).not.toHaveProperty('userId')
  })

  it('combines symbol filtering and analytics attributes in the canonical reader', async () => {
    mockTransactionFindMany.mockResolvedValue([])

    const { readPortfolioTransactions } = await import('~/server/utils/transaction-read')
    await readPortfolioTransactions(7n, { symbol: ' msft ', withAttributes: true })

    expect(mockTransactionFindMany).toHaveBeenCalledWith({
      where: { diary: { userId: 7n }, symbol: 'MSFT' },
      select: { ...BASE_SELECT, strategy: true, emotion: true },
      orderBy: STABLE_ORDER,
    })
  })
})
