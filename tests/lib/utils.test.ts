import { describe, it, expect } from 'vitest'
import { calculateHoldings, formatDate, formatCurrency } from '~/lib/utils'
import type { Transaction, TransactionType } from '@prisma/client'

// Helper function to create a mock transaction
function createTransaction(overrides: Partial<Transaction>): Transaction {
  return {
    id: '1',
    diaryId: 'd1',
    symbol: '2330.TW',
    type: 'BUY' as TransactionType,
    quantity: 10,
    price: 500,
    tradeDate: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides
  }
}

describe('calculateHoldings', () => {
  it('should return empty array when no transactions', () => {
    const result = calculateHoldings([])
    expect(result).toEqual([])
  })

  it('should calculate single buy transaction', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01')
      })
    ]

    const result = calculateHoldings(transactions)
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      symbol: '2330.TW',
      quantity: 10,
      avgCost: 500,
      totalCost: 5000
    })
  })

  it('should calculate multiple buy transactions for same symbol', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01')
      }),
      createTransaction({
        id: '2',
        diaryId: 'd2',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 5,
        price: 550,
        tradeDate: new Date('2024-01-02')
      })
    ]

    const result = calculateHoldings(transactions)
    expect(result).toHaveLength(1)
    expect(result[0].symbol).toBe('2330.TW')
    expect(result[0].quantity).toBe(15)
    expect(result[0].totalCost).toBe(7750)
    expect(result[0].avgCost).toBeCloseTo(516.67, 2)
  })

  it('should calculate sell transaction using average cost', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01')
      }),
      createTransaction({
        id: '2',
        diaryId: 'd2',
        symbol: '2330.TW',
        type: 'SELL',
        quantity: 3,
        price: 600,
        tradeDate: new Date('2024-01-02')
      })
    ]

    const result = calculateHoldings(transactions)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(7)
    expect(result[0].avgCost).toBe(500)
  })

  it('should remove symbol when all shares sold', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01')
      }),
      createTransaction({
        id: '2',
        diaryId: 'd2',
        symbol: '2330.TW',
        type: 'SELL',
        quantity: 10,
        price: 600,
        tradeDate: new Date('2024-01-02')
      })
    ]

    const result = calculateHoldings(transactions)
    expect(result).toHaveLength(0)
  })

  it('should handle multiple symbols separately', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01')
      }),
      createTransaction({
        id: '2',
        diaryId: 'd2',
        symbol: '2317.TW',
        type: 'BUY',
        quantity: 5,
        price: 150,
        tradeDate: new Date('2024-01-02')
      })
    ]

    const result = calculateHoldings(transactions)
    expect(result).toHaveLength(2)
    const symbols = result.map(h => h.symbol).sort()
    expect(symbols).toEqual(['2317.TW', '2330.TW'])
  })

  it('should handle decimal quantities and prices', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        diaryId: 'd1',
        symbol: 'AAPL',
        type: 'BUY',
        quantity: 10.5,
        price: 150.75,
        tradeDate: new Date('2024-01-01')
      })
    ]

    const result = calculateHoldings(transactions)
    expect(result[0].quantity).toBe(10.5)
    expect(result[0].totalCost).toBeCloseTo(1582.875, 3)
    expect(result[0].avgCost).toBe(150.75)
  })

  it('should handle sell before buy (short position)', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'SELL',
        quantity: 5,
        price: 600,
        tradeDate: new Date('2024-01-01')
      }),
      createTransaction({
        id: '2',
        diaryId: 'd2',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-02')
      })
    ]

    const result = calculateHoldings(transactions)
    // When quantity drops to zero or below, symbol is removed from map
    // Then buy creates a fresh position
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(10)
    expect(result[0].totalCost).toBe(5000)
    expect(result[0].avgCost).toBe(500)
  })

  it('should sort transactions by date before calculating', () => {
    const transactions: Transaction[] = [
      createTransaction({
        id: '2',
        diaryId: 'd2',
        symbol: '2330.TW',
        type: 'SELL',
        quantity: 3,
        price: 600,
        tradeDate: new Date('2024-01-05')
      }),
      createTransaction({
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01')
      })
    ]

    const result = calculateHoldings(transactions)
    expect(result[0].quantity).toBe(7)
  })
})

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-15T10:30:00')
    const result = formatDate(date)
    expect(result).toMatch(/\d{4}\/\d{2}\/\d{2}/)
  })

  it('should include time in formatted date', () => {
    const date = new Date('2024-01-15T14:30:00')
    const result = formatDate(date)
    expect(result).toMatch(/\d{2}:\d{2}/)
  })

  it('should handle midnight times', () => {
    const date = new Date('2024-01-15T00:00:00')
    const result = formatDate(date)
    expect(result).toBeDefined()
    expect(result.length).toBeGreaterThan(0)
  })

  it('should format dates with different months and days', () => {
    const date1 = new Date('2024-12-31T23:59:59')
    const result1 = formatDate(date1)
    expect(result1).toContain('2024')

    const date2 = new Date('2024-01-01T00:00:01')
    const result2 = formatDate(date2)
    expect(result2).toContain('2024')
  })
})

describe('formatCurrency', () => {
  it('should format currency with TWD', () => {
    const result = formatCurrency(1234.56)
    // zh-TW locale uses $ for TWD
    expect(result).toMatch(/\$1,234\.56/)
  })

  it('should format zero correctly', () => {
    const result = formatCurrency(0)
    expect(result).toContain('0.00')
  })

  it('should format negative numbers', () => {
    const result = formatCurrency(-100)
    expect(result).toContain('-')
  })

  it('should format large numbers with commas', () => {
    const result = formatCurrency(1000000)
    expect(result).toContain(',')
  })

  it('should handle decimal places correctly', () => {
    const result = formatCurrency(1234.567)
    // Should round to 2 decimal places
    expect(result).toMatch(/\d{1,3}(,\d{3})*(\.\d{2})/)
  })

  it('should format very small amounts', () => {
    const result = formatCurrency(0.01)
    expect(result).toContain('0.01')
  })

  it('should handle negative decimals', () => {
    const result = formatCurrency(-1234.56)
    expect(result).toContain('-')
    expect(result).toContain('1,234.56')
  })
})
