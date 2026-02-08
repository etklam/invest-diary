import { describe, it, expect } from 'vitest'
import { calculateHoldings, getHoldingBySymbol, formatDate, formatCurrency } from '~/lib/utils'
import type { Transaction } from '@prisma/client'

describe('calculateHoldings', () => {
  it('should return empty array when no transactions', () => {
    const result = calculateHoldings([])
    expect(result).toEqual([])
  })

  it('should calculate single buy transaction', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
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
      {
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        diaryId: 'd2',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 5,
        price: 550,
        tradeDate: new Date('2024-01-02'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
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
      {
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        diaryId: 'd2',
        symbol: '2330.TW',
        type: 'SELL',
        quantity: 3,
        price: 600,
        tradeDate: new Date('2024-01-02'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const result = calculateHoldings(transactions)
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe(7)
    expect(result[0].avgCost).toBe(500)
  })

  it('should remove symbol when all shares sold', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        diaryId: 'd2',
        symbol: '2330.TW',
        type: 'SELL',
        quantity: 10,
        price: 600,
        tradeDate: new Date('2024-01-02'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const result = calculateHoldings(transactions)
    expect(result).toHaveLength(0)
  })

  it('should handle multiple symbols separately', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        diaryId: 'd2',
        symbol: '2317.TW',
        type: 'BUY',
        quantity: 5,
        price: 150,
        tradeDate: new Date('2024-01-02'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const result = calculateHoldings(transactions)
    expect(result).toHaveLength(2)
    const symbols = result.map(h => h.symbol).sort()
    expect(symbols).toEqual(['2317.TW', '2330.TW'])
  })
})

describe('getHoldingBySymbol', () => {
  it('should return null when symbol not found', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const result = getHoldingBySymbol(transactions, '2317.TW')
    expect(result).toBeNull()
  })

  it('should return holding for existing symbol', () => {
    const transactions: Transaction[] = [
      {
        id: '1',
        diaryId: 'd1',
        symbol: '2330.TW',
        type: 'BUY',
        quantity: 10,
        price: 500,
        tradeDate: new Date('2024-01-01'),
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ]

    const result = getHoldingBySymbol(transactions, '2330.TW')
    expect(result).toEqual({
      symbol: '2330.TW',
      quantity: 10,
      avgCost: 500,
      totalCost: 5000
    })
  })
})

describe('formatDate', () => {
  it('should format date correctly', () => {
    const date = new Date('2024-01-15T10:30:00')
    const result = formatDate(date)
    expect(result).toMatch(/\d{4}\/\d{2}\/\d{2}/)
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
})
