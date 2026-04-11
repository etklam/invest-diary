import { describe, it, expect } from 'vitest'
import {
  matchTrades,
  calcWinRate,
  calcMaxDrawdown,
  calcSharpe,
  groupByPeriod,
  calcPeriodStats,
  buildEquityCurve,
  type RawTransaction,
  type ClosedTrade,
} from '~/lib/trade-analytics'

// ─── 測試輔助 ────────────────────────────────────────────────────────────────

function makeTx(
  overrides: Partial<RawTransaction> & Pick<RawTransaction, 'type' | 'quantity' | 'price'>
): RawTransaction {
  return {
    id: overrides.id ?? '1',
    symbol: overrides.symbol ?? 'AAPL',
    tradeDate: overrides.tradeDate ?? new Date('2024-01-10'),
    ...overrides,
  }
}

// ─── matchTrades ─────────────────────────────────────────────────────────────

describe('matchTrades', () => {
  it('空陣列 → 返回空陣列', () => {
    expect(matchTrades([])).toEqual([])
  })

  it('只有 BUY，沒有 SELL → 無已關閉交易', () => {
    const txs = [makeTx({ id: '1', type: 'BUY', quantity: 10, price: 100 })]
    expect(matchTrades(txs)).toEqual([])
  })

  it('單次 BUY 後全部 SELL → 計算正確損益', () => {
    const txs = [
      makeTx({ id: '1', type: 'BUY', quantity: 10, price: 100, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: '2', type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-02-01') }),
    ]
    const result = matchTrades(txs)
    expect(result).toHaveLength(1)
    expect(result[0].realizedPnL).toBeCloseTo(200)        // (120-100)*10
    expect(result[0].realizedPnLPct).toBeCloseTo(20)      // 20%
    expect(result[0].avgCostBasis).toBeCloseTo(100)
    expect(result[0].symbol).toBe('AAPL')
  })

  it('多次 BUY 後部分 SELL → 平均成本正確', () => {
    // 買 10 股 @ 100，再買 10 股 @ 200 → 平均成本 150
    // 賣 10 股 @ 180 → 損益 (180-150)*10 = 300
    const txs = [
      makeTx({ id: '1', type: 'BUY', quantity: 10, price: 100, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: '2', type: 'BUY', quantity: 10, price: 200, tradeDate: new Date('2024-01-15') }),
      makeTx({ id: '3', type: 'SELL', quantity: 10, price: 180, tradeDate: new Date('2024-02-01') }),
    ]
    const result = matchTrades(txs)
    expect(result).toHaveLength(1)
    expect(result[0].avgCostBasis).toBeCloseTo(150)
    expect(result[0].realizedPnL).toBeCloseTo(300)
  })

  it('虧損交易 → 損益為負', () => {
    const txs = [
      makeTx({ id: '1', type: 'BUY', quantity: 10, price: 150, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: '2', type: 'SELL', quantity: 10, price: 100, tradeDate: new Date('2024-02-01') }),
    ]
    const result = matchTrades(txs)
    expect(result[0].realizedPnL).toBeCloseTo(-500)       // (100-150)*10
    expect(result[0].realizedPnLPct).toBeCloseTo(-33.333)
  })

  it('兩個不同 symbol 各自獨立計算', () => {
    const txs = [
      makeTx({ id: '1', symbol: 'AAPL', type: 'BUY', quantity: 5, price: 100 }),
      makeTx({ id: '2', symbol: 'TSLA', type: 'BUY', quantity: 3, price: 200 }),
      makeTx({ id: '3', symbol: 'AAPL', type: 'SELL', quantity: 5, price: 120, tradeDate: new Date('2024-02-01') }),
      makeTx({ id: '4', symbol: 'TSLA', type: 'SELL', quantity: 3, price: 180, tradeDate: new Date('2024-02-01') }),
    ]
    const result = matchTrades(txs)
    expect(result).toHaveLength(2)
    const aapl = result.find((r) => r.symbol === 'AAPL')!
    const tsla = result.find((r) => r.symbol === 'TSLA')!
    expect(aapl.realizedPnL).toBeCloseTo(100)             // (120-100)*5
    expect(tsla.realizedPnL).toBeCloseTo(-60)             // (180-200)*3
  })

  it('SELL without BUY → 跳過，不拋錯', () => {
    const txs = [
      makeTx({ id: '1', type: 'SELL', quantity: 10, price: 100 }),
    ]
    expect(() => matchTrades(txs)).not.toThrow()
    expect(matchTrades(txs)).toEqual([])
  })

  it('多筆 SELL 分批平倉 → 各自計算', () => {
    const txs = [
      makeTx({ id: '1', type: 'BUY', quantity: 20, price: 100, tradeDate: new Date('2024-01-01') }),
      makeTx({ id: '2', type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-02-01') }),
      makeTx({ id: '3', type: 'SELL', quantity: 10, price: 90,  tradeDate: new Date('2024-03-01') }),
    ]
    const result = matchTrades(txs)
    expect(result).toHaveLength(2)
    expect(result[0].realizedPnL).toBeCloseTo(200)   // (120-100)*10
    expect(result[1].realizedPnL).toBeCloseTo(-100)  // (90-100)*10
  })

  it('Decimal-like 物件（Prisma Decimal）能正確轉換', () => {
    // Prisma Decimal 有 valueOf() 方法
    const decimalLike = (v: number) => ({ valueOf: () => v, toString: () => String(v) })
    const txs: RawTransaction[] = [
      {
        id: '1', symbol: 'AAPL', type: 'BUY',
        quantity: decimalLike(10), price: decimalLike(100),
        tradeDate: new Date('2024-01-01'),
      },
      {
        id: '2', symbol: 'AAPL', type: 'SELL',
        quantity: decimalLike(10), price: decimalLike(110),
        tradeDate: new Date('2024-02-01'),
      },
    ]
    const result = matchTrades(txs)
    expect(result[0].realizedPnL).toBeCloseTo(100)
  })

  it('按 tradeDate 排序 — 日期順序影響平均成本', () => {
    // 故意逆序輸入，確保函數會排序
    const txs = [
      makeTx({ id: '3', type: 'SELL', quantity: 10, price: 130, tradeDate: new Date('2024-03-01') }),
      makeTx({ id: '1', type: 'BUY', quantity: 10, price: 100, tradeDate: new Date('2024-01-01') }),
    ]
    const result = matchTrades(txs)
    expect(result).toHaveLength(1)
    expect(result[0].realizedPnL).toBeCloseTo(300)   // (130-100)*10
  })
})

// ─── calcWinRate ─────────────────────────────────────────────────────────────

describe('calcWinRate', () => {
  it('空陣列 → winRate = 0，不除以零', () => {
    const r = calcWinRate([])
    expect(r.winRate).toBe(0)
    expect(r.total).toBe(0)
    expect(r.wins).toBe(0)
  })

  it('全贏 → winRate = 100', () => {
    const trades: ClosedTrade[] = [
      { id: '1', symbol: 'A', sellDate: new Date(), sellQuantity: 1, sellPrice: 110, avgCostBasis: 100, realizedPnL: 10, realizedPnLPct: 10 },
      { id: '2', symbol: 'B', sellDate: new Date(), sellQuantity: 1, sellPrice: 220, avgCostBasis: 200, realizedPnL: 20, realizedPnLPct: 10 },
    ]
    const r = calcWinRate(trades)
    expect(r.wins).toBe(2)
    expect(r.losses).toBe(0)
    expect(r.winRate).toBeCloseTo(100)
  })

  it('全輸 → winRate = 0', () => {
    const trades: ClosedTrade[] = [
      { id: '1', symbol: 'A', sellDate: new Date(), sellQuantity: 1, sellPrice: 90, avgCostBasis: 100, realizedPnL: -10, realizedPnLPct: -10 },
    ]
    const r = calcWinRate(trades)
    expect(r.wins).toBe(0)
    expect(r.losses).toBe(1)
    expect(r.winRate).toBe(0)
  })

  it('混合 2 贏 1 輸 → winRate = 66.67', () => {
    const make = (pnl: number) => ({
      id: String(pnl), symbol: 'X', sellDate: new Date(), sellQuantity: 1, sellPrice: 0,
      avgCostBasis: 0, realizedPnL: pnl, realizedPnLPct: 0,
    })
    const r = calcWinRate([make(10), make(20), make(-5)])
    expect(r.wins).toBe(2)
    expect(r.losses).toBe(1)
    expect(r.winRate).toBeCloseTo(66.667)
  })

  it('平手交易 (pnl=0) 算入 breakEven', () => {
    const make = (pnl: number) => ({
      id: String(pnl), symbol: 'X', sellDate: new Date(), sellQuantity: 1, sellPrice: 0,
      avgCostBasis: 0, realizedPnL: pnl, realizedPnLPct: 0,
    })
    const r = calcWinRate([make(10), make(0), make(-5)])
    expect(r.breakEven).toBe(1)
    expect(r.wins).toBe(1)
    expect(r.losses).toBe(1)
  })
})

// ─── calcMaxDrawdown ─────────────────────────────────────────────────────────

describe('calcMaxDrawdown', () => {
  it('空陣列 → drawdown = 0', () => {
    expect(calcMaxDrawdown([]).maxDrawdownPct).toBe(0)
  })

  it('單一值 → drawdown = 0', () => {
    expect(calcMaxDrawdown([100]).maxDrawdownPct).toBe(0)
  })

  it('單調上升 → drawdown = 0', () => {
    expect(calcMaxDrawdown([100, 110, 120, 130]).maxDrawdownPct).toBeCloseTo(0)
  })

  it('單調下降 → drawdown ≈ (peak-trough)/peak * 100', () => {
    const r = calcMaxDrawdown([100, 80, 60, 40])
    // peak=100, trough=40 → (100-40)/100 = 60%
    expect(r.maxDrawdownPct).toBeCloseTo(60)
    expect(r.peakValue).toBe(100)
    expect(r.troughValue).toBe(40)
  })

  it('先漲後跌再漲 → 正確找到最大回撤', () => {
    // 100 → 200 → 80 → 250
    // 最大回撤：從 200 跌到 80 = (200-80)/200 = 60%
    const r = calcMaxDrawdown([100, 200, 80, 250])
    expect(r.maxDrawdownPct).toBeCloseTo(60)
    expect(r.peakValue).toBeCloseTo(200)
    expect(r.troughValue).toBeCloseTo(80)
  })
})

// ─── calcSharpe ──────────────────────────────────────────────────────────────

describe('calcSharpe', () => {
  it('空陣列 → sharpe = null', () => {
    expect(calcSharpe([]).sharpe).toBeNull()
  })

  it('零波動（全部相同收益率）→ sharpe = null', () => {
    expect(calcSharpe([5, 5, 5, 5]).sharpe).toBeNull()
  })

  it('正夏普：平均收益 > 無風險利率', () => {
    // 高平均收益，低波動 → 夏普 > 0
    const returns = [3, 4, 5, 3, 4, 5, 3, 4, 5, 3, 4, 5]
    const r = calcSharpe(returns, 0)
    expect(r.sharpe).not.toBeNull()
    expect(r.sharpe!).toBeGreaterThan(0)
  })

  it('負夏普：平均收益 < 無風險利率', () => {
    // 收益低，波動大
    const returns = [-3, -4, -5, -3, -4, -5]
    const r = calcSharpe(returns, 0)
    expect(r.sharpe).not.toBeNull()
    expect(r.sharpe!).toBeLessThan(0)
  })

  it('單一收益率 → stdDev = 0 → sharpe = null', () => {
    expect(calcSharpe([5]).sharpe).toBeNull()
  })
})

// ─── groupByPeriod ───────────────────────────────────────────────────────────

describe('groupByPeriod', () => {
  const makeTrade = (id: string, date: string, pnl: number): ClosedTrade => ({
    id,
    symbol: 'X',
    sellDate: new Date(date),
    sellQuantity: 1,
    sellPrice: 0,
    avgCostBasis: 0,
    realizedPnL: pnl,
    realizedPnLPct: 0,
  })

  it('按月份分群', () => {
    const trades = [
      makeTrade('1', '2024-01-15', 100),
      makeTrade('2', '2024-01-25', 50),
      makeTrade('3', '2024-02-10', -30),
    ]
    const grouped = groupByPeriod(trades, 'month')
    expect(grouped.get('2024-01')).toHaveLength(2)
    expect(grouped.get('2024-02')).toHaveLength(1)
  })

  it('按季度分群', () => {
    const trades = [
      makeTrade('1', '2024-01-15', 100),  // Q1
      makeTrade('2', '2024-04-10', 50),   // Q2
      makeTrade('3', '2024-03-25', -30),  // Q1
    ]
    const grouped = groupByPeriod(trades, 'quarter')
    expect(grouped.get('2024-Q1')).toHaveLength(2)
    expect(grouped.get('2024-Q2')).toHaveLength(1)
  })

  it('按年分群', () => {
    const trades = [
      makeTrade('1', '2023-06-01', 100),
      makeTrade('2', '2024-03-01', 50),
      makeTrade('3', '2024-12-31', -30),
    ]
    const grouped = groupByPeriod(trades, 'year')
    expect(grouped.get('2023')).toHaveLength(1)
    expect(grouped.get('2024')).toHaveLength(2)
  })

  it('跨年邊界 (12月/1月)', () => {
    const trades = [
      makeTrade('1', '2023-12-31', 100),
      makeTrade('2', '2024-01-01', 50),
    ]
    const grouped = groupByPeriod(trades, 'month')
    expect(grouped.get('2023-12')).toHaveLength(1)
    expect(grouped.get('2024-01')).toHaveLength(1)
  })
})

// ─── calcPeriodStats ─────────────────────────────────────────────────────────

describe('calcPeriodStats', () => {
  const makeTrade = (id: string, pnl: number): ClosedTrade => ({
    id,
    symbol: 'X',
    sellDate: new Date(),
    sellQuantity: 1,
    sellPrice: 0,
    avgCostBasis: 0,
    realizedPnL: pnl,
    realizedPnLPct: 0,
  })

  it('正確計算每期損益和勝率', () => {
    const grouped = new Map([
      ['2024-01', [makeTrade('1', 100), makeTrade('2', -50)]],
      ['2024-02', [makeTrade('3', 200)]],
    ])
    const stats = calcPeriodStats(grouped)
    expect(stats).toHaveLength(2)

    const jan = stats.find((s) => s.period === '2024-01')!
    expect(jan.realizedPnL).toBe(50)
    expect(jan.tradeCount).toBe(2)
    expect(jan.winRate).toBeCloseTo(50)

    const feb = stats.find((s) => s.period === '2024-02')!
    expect(feb.realizedPnL).toBe(200)
    expect(feb.winRate).toBe(100)
  })

  it('按時間升序返回', () => {
    const grouped = new Map([
      ['2024-03', [makeTrade('3', 10)]],
      ['2024-01', [makeTrade('1', 10)]],
      ['2024-02', [makeTrade('2', 10)]],
    ])
    const stats = calcPeriodStats(grouped)
    expect(stats.map((s) => s.period)).toEqual(['2024-01', '2024-02', '2024-03'])
  })
})

// ─── buildEquityCurve ────────────────────────────────────────────────────────

describe('buildEquityCurve', () => {
  const makeTrade = (id: string, date: string, pnl: number): ClosedTrade => ({
    id,
    symbol: 'X',
    sellDate: new Date(date),
    sellQuantity: 1,
    sellPrice: 0,
    avgCostBasis: 0,
    realizedPnL: pnl,
    realizedPnLPct: 0,
  })

  it('空陣列 → [initialCapital]', () => {
    expect(buildEquityCurve([], 100)).toEqual([100])
  })

  it('累積損益計算正確', () => {
    const trades = [
      makeTrade('1', '2024-01-01', 50),
      makeTrade('2', '2024-02-01', -30),
      makeTrade('3', '2024-03-01', 80),
    ]
    const curve = buildEquityCurve(trades, 100)
    expect(curve).toEqual([100, 150, 120, 200])
  })

  it('按日期升序排序（不受輸入順序影響）', () => {
    const trades = [
      makeTrade('2', '2024-02-01', -30),
      makeTrade('1', '2024-01-01', 50),
    ]
    const curve = buildEquityCurve(trades, 100)
    // 先 +50 再 -30
    expect(curve).toEqual([100, 150, 120])
  })
})

// ─── 整合測試：完整流程 ───────────────────────────────────────────────────────

describe('整合：matchTrades → calcWinRate → buildEquityCurve → calcMaxDrawdown', () => {
  it('完整交易週期計算', () => {
    const txs: RawTransaction[] = [
      // AAPL: 買 10 @ 100，賣 10 @ 120 → +200
      { id: '1', symbol: 'AAPL', type: 'BUY',  quantity: 10, price: 100, tradeDate: new Date('2024-01-01') },
      { id: '2', symbol: 'AAPL', type: 'SELL', quantity: 10, price: 120, tradeDate: new Date('2024-02-01') },
      // TSLA: 買 5 @ 200，賣 5 @ 160 → -200
      { id: '3', symbol: 'TSLA', type: 'BUY',  quantity: 5,  price: 200, tradeDate: new Date('2024-01-15') },
      { id: '4', symbol: 'TSLA', type: 'SELL', quantity: 5,  price: 160, tradeDate: new Date('2024-03-01') },
      // NVDA: 買 2 @ 500，賣 2 @ 600 → +200
      { id: '5', symbol: 'NVDA', type: 'BUY',  quantity: 2,  price: 500, tradeDate: new Date('2024-02-15') },
      { id: '6', symbol: 'NVDA', type: 'SELL', quantity: 2,  price: 600, tradeDate: new Date('2024-04-01') },
    ]

    const closed = matchTrades(txs)
    expect(closed).toHaveLength(3)

    const { winRate, wins, losses } = calcWinRate(closed)
    expect(wins).toBe(2)
    expect(losses).toBe(1)
    expect(winRate).toBeCloseTo(66.667)

    const curve = buildEquityCurve(closed, 1000)
    // 依日期：AAPL+200 → TSLA-200 → NVDA+200
    expect(curve).toEqual([1000, 1200, 1000, 1200])

    const { maxDrawdownPct } = calcMaxDrawdown(curve)
    // 從 1200 跌到 1000 → (1200-1000)/1200 = 16.67%
    expect(maxDrawdownPct).toBeCloseTo(16.667)
  })
})
