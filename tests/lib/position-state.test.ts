import { describe, it, expect } from 'vitest'
import { computePositionState } from '~/lib/position-state'
import type { PositionStateInput } from '~/lib/position-state'

function tx(overrides: Partial<PositionStateInput> & Pick<PositionStateInput, 'type' | 'quantity' | 'price'>): PositionStateInput {
  return {
    symbol: overrides.symbol ?? 'AAPL',
    tradeDate: overrides.tradeDate ?? new Date('2024-01-10'),
    ...overrides,
  }
}

// ─── computePositionState ─────────────────────────────────────────────────────

describe('computePositionState', () => {
  it('空陣列 → 返回空陣列', () => {
    expect(computePositionState([])).toEqual([])
  })

  it('單筆 BUY → 正確的數量、成本、平均成本', () => {
    const result = computePositionState([
      tx({ type: 'BUY', quantity: 10, price: 500, tradeDate: new Date('2024-01-01') }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0]).toEqual({
      symbol: 'AAPL',
      totalQuantity: 10,
      totalCost: 5000,
      avgCost: 500,
    })
  })

  it('同 symbol 多筆 BUY → 累加數量，加權平均成本', () => {
    const result = computePositionState([
      tx({ type: 'BUY', quantity: 10, price: 500, tradeDate: new Date('2024-01-01') }),
      tx({ type: 'BUY', quantity: 5, price: 550, tradeDate: new Date('2024-01-02') }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].totalQuantity).toBe(15)
    expect(result[0].totalCost).toBe(7750)
    expect(result[0].avgCost).toBeCloseTo(516.67, 2)
  })

  it('BUY 後部分 SELL → 減去數量，平均成本不變', () => {
    const result = computePositionState([
      tx({ type: 'BUY', quantity: 10, price: 500, tradeDate: new Date('2024-01-01') }),
      tx({ type: 'SELL', quantity: 3, price: 600, tradeDate: new Date('2024-01-02') }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].totalQuantity).toBe(7)
    expect(result[0].totalCost).toBeCloseTo(3500) // 5000 - 3*500
    expect(result[0].avgCost).toBeCloseTo(500)
  })

  it('全部賣出 → symbol 從結果中移除', () => {
    const result = computePositionState([
      tx({ type: 'BUY', quantity: 10, price: 500, tradeDate: new Date('2024-01-01') }),
      tx({ type: 'SELL', quantity: 10, price: 600, tradeDate: new Date('2024-01-02') }),
    ])
    expect(result).toHaveLength(0)
  })

  it('不同 symbol 各自獨立計算', () => {
    const result = computePositionState([
      tx({ symbol: 'AAPL', type: 'BUY', quantity: 10, price: 100 }),
      tx({ symbol: 'TSLA', type: 'BUY', quantity: 5, price: 200 }),
    ])
    expect(result).toHaveLength(2)
    const symbols = result.map(r => r.symbol).sort()
    expect(symbols).toEqual(['AAPL', 'TSLA'])
  })

  it('多筆 BUY 後多次 SELL → 正確退化', () => {
    const result = computePositionState([
      tx({ type: 'BUY', quantity: 20, price: 100, tradeDate: new Date('2024-01-01') }),
      tx({ type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-02-01') }),
      tx({ type: 'SELL', quantity: 5, price: 90, tradeDate: new Date('2024-03-01') }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].totalQuantity).toBe(5)
    expect(result[0].totalCost).toBeCloseTo(500) // 2000 - 1000 - 500
    expect(result[0].avgCost).toBeCloseTo(100)
  })

  it('按 tradeDate 排序 — 逆序輸入仍正確', () => {
    const result = computePositionState([
      tx({ type: 'SELL', quantity: 3, price: 600, tradeDate: new Date('2024-01-05') }),
      tx({ type: 'BUY', quantity: 10, price: 500, tradeDate: new Date('2024-01-01') }),
    ])
    expect(result[0].totalQuantity).toBe(7)
  })

  it('Date 物件和 ISO 字串都可以用', () => {
    const result = computePositionState([
      tx({ type: 'BUY', quantity: 10, price: 100, tradeDate: '2024-01-01T00:00:00Z' }),
    ])
    expect(result[0].totalQuantity).toBe(10)
  })

  // ─── Symbol 正規化 ─────────────────────────────────────────────────────────

  it('symbol 自動去空白', () => {
    const result = computePositionState([
      tx({ symbol: '  AAPL  ', type: 'BUY', quantity: 10, price: 100 }),
      tx({ symbol: 'AAPL', type: 'BUY', quantity: 5, price: 100 }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].totalQuantity).toBe(15)
  })

  it('symbol 自動轉大寫', () => {
    const result = computePositionState([
      tx({ symbol: 'aapl', type: 'BUY', quantity: 10, price: 100 }),
      tx({ symbol: 'AAPL', type: 'BUY', quantity: 5, price: 100 }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].totalQuantity).toBe(15)
  })

  it('symbol 同時去空白 + 轉大寫', () => {
    const result = computePositionState([
      tx({ symbol: '  aapl  ', type: 'BUY', quantity: 10, price: 100 }),
      tx({ symbol: 'AAPL', type: 'BUY', quantity: 5, price: 100 }),
    ])
    expect(result).toHaveLength(1)
    expect(result[0].totalQuantity).toBe(15)
    expect(result[0].symbol).toBe('AAPL')
  })

  // ─── 錯誤處理 ──────────────────────────────────────────────────────────────

  it('無持倉卻 SELL → 拋錯', () => {
    expect(() => computePositionState([
      tx({ type: 'SELL', quantity: 10, price: 100 }),
    ])).toThrow(/sell.*without.*hold/i)
  })

  it('SELL 超過持倉 → 拋錯', () => {
    expect(() => computePositionState([
      tx({ type: 'BUY', quantity: 5, price: 100, tradeDate: new Date('2024-01-01') }),
      tx({ type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-01-02') }),
    ])).toThrow(/sell.*exceed.*hold/i)
  })

  it('部分 SELL 後再超賣 → 拋錯', () => {
    expect(() => computePositionState([
      tx({ type: 'BUY', quantity: 10, price: 100, tradeDate: new Date('2024-01-01') }),
      tx({ type: 'SELL', quantity: 5, price: 120, tradeDate: new Date('2024-01-02') }),
      tx({ type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-01-03') }),
    ])).toThrow(/sell.*exceed/i)
  })

  // ─── 小數 ──────────────────────────────────────────────────────────────────

  it('小數數量和價格正確計算', () => {
    const result = computePositionState([
      tx({ type: 'BUY', quantity: 10.5, price: 150.75 }),
    ])
    expect(result[0].totalQuantity).toBe(10.5)
    expect(result[0].totalCost).toBeCloseTo(1582.875, 3)
    expect(result[0].avgCost).toBeCloseTo(150.75)
  })

  it('小數持倉，全部賣出後移除', () => {
    const result = computePositionState([
      tx({ type: 'BUY', quantity: 10.5, price: 100 }),
      tx({ type: 'SELL', quantity: 10.5, price: 110 }),
    ])
    expect(result).toHaveLength(0)
  })
})
