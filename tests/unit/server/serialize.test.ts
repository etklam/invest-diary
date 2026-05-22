import { describe, expect, it } from 'vitest'
import { serialize } from '~/server/utils/serialize'

describe('serialize', () => {
  it('converts top-level BigInt to string', () => {
    expect(serialize(1n)).toBe('1')
  })

  it('converts BigInt inside plain objects', () => {
    const input = { id: 42n, name: 'test' }
    const result = serialize(input)
    expect(result).toEqual({ id: '42', name: 'test' })
  })

  it('converts BigInt inside nested objects', () => {
    const input = { user: { id: 1n, profile: { partnerId: 99n } } }
    const result = serialize(input)
    expect(result).toEqual({ user: { id: '1', profile: { partnerId: '99' } } })
  })

  it('converts BigInt inside arrays', () => {
    const input = [1n, 2n, 3n]
    const result = serialize(input)
    expect(result).toEqual(['1', '2', '3'])
  })

  it('converts BigInt inside arrays of objects', () => {
    const input = [{ id: 1n, x: 10 }, { id: 2n, x: 20 }]
    const result = serialize(input)
    expect(result).toEqual([{ id: '1', x: 10 }, { id: '2', x: 20 }])
  })

  it('preserves Date objects without converting', () => {
    const date = new Date('2026-01-15T00:00:00.000Z')
    const input = { id: 1n, createdAt: date }
    const result = serialize(input)
    expect(result).toEqual({ id: '1', createdAt: date })
    expect(result.createdAt).toBeInstanceOf(Date)
  })

  it('preserves null and undefined', () => {
    expect(serialize(null)).toBeNull()
    expect(serialize(undefined)).toBeUndefined()
  })

  it('preserves primitives', () => {
    expect(serialize('hello')).toBe('hello')
    expect(serialize(42)).toBe(42)
    expect(serialize(true)).toBe(true)
    expect(serialize(false)).toBe(false)
  })

  it('preserves Decimal-like objects with valueOf', () => {
    // Prisma Decimal has valueOf() but is a plain object
    const input = { price: { valueOf: () => 123.45 } }
    const result = serialize(input)
    expect(result).toEqual({ price: { valueOf: expect.any(Function) } })
  })

  it('handles empty objects and arrays', () => {
    expect(serialize({})).toEqual({})
    expect(serialize([])).toEqual([])
  })

  it('handles mixed nested structure (realistic Prisma response)', () => {
    const input = {
      id: 1n,
      userId: 100n,
      title: 'My Diary',
      content: 'Market went up',
      tagsString: 'tech,earnings',
      createdAt: new Date('2026-05-20'),
      transactions: [
        { id: 10n, symbol: 'AAPL', type: 'BUY', quantity: { valueOf: () => 5 }, price: { valueOf: () => 180 } },
      ],
      alerts: [
        { id: 20n, message: 'Check diary', isDismissed: false },
      ],
    }

    const result = serialize(input)

    expect(result.id).toBe('1')
    expect(result.userId).toBe('100')
    expect(result.title).toBe('My Diary')
    expect(result.createdAt).toBeInstanceOf(Date)
    expect(result.transactions[0].id).toBe('10')
    expect(result.alerts[0].id).toBe('20')
  })

  it('handles objects with null fields', () => {
    const input = { id: 1n, name: null, email: undefined }
    const result = serialize(input)
    expect(result).toEqual({ id: '1', name: null, email: undefined })
  })
})
