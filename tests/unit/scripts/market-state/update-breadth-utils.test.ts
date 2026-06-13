import { describe, expect, it } from 'vitest'
import {
  calculateBreadthRows,
  groupPricesBySymbol,
  isFinitePrice,
  parseDailyPrices,
  resolveRangeStart,
  toDateKey,
  toDateOnly,
  type PricePoint,
  type YahooChartQuote,
} from '~/lib/market-state/update-breadth-utils'

function date(key: string): Date {
  return new Date(`${key}T12:34:56.789Z`)
}

function utcDate(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`)
}

function price(symbol: string, key: string, adjustedClose: number): PricePoint {
  return { symbol, date: utcDate(key), adjustedClose }
}

function sequentialPrices(symbol: string, startKey: string, closes: number[]): PricePoint[] {
  const start = utcDate(startKey)
  return closes.map((adjustedClose, index) => {
    const day = new Date(start)
    day.setUTCDate(day.getUTCDate() + index)
    return { symbol, date: day, adjustedClose }
  })
}

describe('MarketState update breadth date helpers', () => {
  it('toDateOnly 回傳 UTC 零點日期', () => {
    const result = toDateOnly(date('2026-03-15'))

    expect(result.toISOString()).toBe('2026-03-15T00:00:00.000Z')
  })

  it('toDateKey 回傳 YYYY-MM-DD', () => {
    expect(toDateKey(date('2026-03-15'))).toBe('2026-03-15')
  })

  it('resolveRangeStart 正確回推 1mo 與 1y', () => {
    const now = new Date('2026-06-05T08:30:00.000Z')

    expect(resolveRangeStart('1mo', now).toISOString()).toBe('2026-05-05T08:30:00.000Z')
    expect(resolveRangeStart('1y', now).toISOString()).toBe('2025-06-05T08:30:00.000Z')
  })
})

describe('isFinitePrice', () => {
  it('只接受正數且 finite 的 number', () => {
    expect(isFinitePrice(1)).toBe(true)
    expect(isFinitePrice(0.01)).toBe(true)
    expect(isFinitePrice(0)).toBe(false)
    expect(isFinitePrice(-1)).toBe(false)
    expect(isFinitePrice(Number.POSITIVE_INFINITY)).toBe(false)
    expect(isFinitePrice(Number.NaN)).toBe(false)
    expect(isFinitePrice('1')).toBe(false)
    expect(isFinitePrice(null)).toBe(false)
  })
})

describe('parseDailyPrices', () => {
  it('把 Yahoo chart quotes 轉為 DailyPriceInput 並正規化日期與 volume', () => {
    const quotes: YahooChartQuote[] = [
      {
        date: date('2026-03-15'),
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        adjclose: 104.5,
        volume: 1234.9,
      },
      {
        date: date('2026-03-16'),
        open: 105,
        high: 108,
        low: 101,
        close: 106,
        volume: -1,
      },
    ]

    const result = parseDailyPrices('AAPL', quotes)

    expect(result).toEqual([
      {
        symbol: 'AAPL',
        date: utcDate('2026-03-15'),
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        adjustedClose: 104.5,
        volume: BigInt(1234),
      },
      {
        symbol: 'AAPL',
        date: utcDate('2026-03-16'),
        open: 105,
        high: 108,
        low: 101,
        close: 106,
        adjustedClose: 106,
        volume: BigInt(0),
      },
    ])
  })

  it('略過缺日期或 OHLC 無效的 quote', () => {
    const result = parseDailyPrices('MSFT', [
      { date: date('2026-03-15'), open: 100, high: 110, low: 95, close: 105 },
      { open: 100, high: 110, low: 95, close: 105 },
      { date: date('2026-03-16'), open: 0, high: 110, low: 95, close: 105 },
      { date: date('2026-03-17'), open: 100, high: Number.NaN, low: 95, close: 105 },
      { date: date('2026-03-18'), open: 100, high: 110, low: 95, close: null },
    ])

    expect(result).toHaveLength(1)
    expect(result[0].date).toEqual(utcDate('2026-03-15'))
  })
})

describe('groupPricesBySymbol', () => {
  it('依 symbol 分組並依日期升冪排序', () => {
    const grouped = groupPricesBySymbol([
      price('MSFT', '2026-03-03', 3),
      price('AAPL', '2026-03-02', 2),
      price('MSFT', '2026-03-01', 1),
      price('AAPL', '2026-03-01', 1),
    ])

    expect(Array.from(grouped.keys()).sort()).toEqual(['AAPL', 'MSFT'])
    expect(grouped.get('AAPL')?.map(item => toDateKey(item.date))).toEqual(['2026-03-01', '2026-03-02'])
    expect(grouped.get('MSFT')?.map(item => toDateKey(item.date))).toEqual(['2026-03-01', '2026-03-03'])
  })
})

describe('calculateBreadthRows', () => {
  it('價格為空時回傳空結果', () => {
    expect(calculateBreadthRows([], ['AAPL'], [utcDate('2026-03-15')], [])).toEqual([])
  })

  it('單一 symbol、單一目標日正確計算 up4/down4', () => {
    const rows = calculateBreadthRows(
      [
        price('AAPL', '2026-03-14', 100),
        price('AAPL', '2026-03-15', 104),
      ],
      ['AAPL'],
      [utcDate('2026-03-15')],
      [],
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].up4Count).toBe(1)
    expect(rows[0].down4Count).toBe(0)
    expect(rows[0].up4Pct).toBe(100)
    expect(rows[0].down4Pct).toBe(0)
  })

  it('滿 40 根價格後計算 above40dPct 與 above40dCount', () => {
    const rows = calculateBreadthRows(
      [
        ...sequentialPrices('AAPL', '2026-01-01', [...Array(39).fill(100), 110]),
        ...sequentialPrices('MSFT', '2026-01-01', [...Array(39).fill(100), 90]),
      ],
      ['AAPL', 'MSFT'],
      [utcDate('2026-02-09')],
      [],
    )

    expect(rows).toHaveLength(1)
    expect(rows[0].above40dCount).toBe(1)
    expect(rows[0].above40dPct).toBe(50)
  })

  it('用既有 breadth history 暖機計算 ratio5d 與 ratio10d', () => {
    const existingHistory = Array.from({ length: 9 }, (_, index) => {
      const day = utcDate('2026-03-01')
      day.setUTCDate(day.getUTCDate() + index)
      return { date: day, up4Count: 2, down4Count: 1 }
    })

    const rows = calculateBreadthRows(
      [
        price('AAPL', '2026-03-09', 100),
        price('AAPL', '2026-03-10', 104),
      ],
      ['AAPL'],
      [utcDate('2026-03-10')],
      existingHistory,
    )

    expect(rows[0].ratio5d).toBeCloseTo(9 / 4)
    expect(rows[0].ratio10d).toBeCloseTo(19 / 9)
  })

  it('根據輸入資料決定 regime 與 score', () => {
    const symbols = Array.from({ length: 10 }, (_, index) => `SYM${index}`)
    const prices = symbols.flatMap((symbol, index) => {
      const closes = index < 6 ? [...Array(39).fill(100), 110] : Array(40).fill(120)
      return sequentialPrices(symbol, '2026-01-01', closes)
    })
    const existingHistory = Array.from({ length: 9 }, (_, index) => {
      const day = utcDate('2026-01-31')
      day.setUTCDate(day.getUTCDate() + index)
      return { date: day, up4Count: 4, down4Count: 1 }
    })

    const rows = calculateBreadthRows(prices, symbols, [utcDate('2026-02-09')], existingHistory)

    expect(rows[0].regime).toBe('risk_on')
    expect(rows[0].score).toBeGreaterThan(0)
  })

  it('coveragePct 反映實際資料覆蓋率', () => {
    const rows = calculateBreadthRows(
      [
        price('AAPL', '2026-03-14', 100),
        price('AAPL', '2026-03-15', 104),
      ],
      ['AAPL', 'MSFT'],
      [utcDate('2026-03-15')],
      [],
    )

    expect(rows[0].coveragePct).toBe(50)
  })

  it('coverage 低於 90% 時標記 isStale', () => {
    const rows = calculateBreadthRows(
      [
        price('AAPL', '2026-03-14', 100),
        price('AAPL', '2026-03-15', 104),
      ],
      ['AAPL', 'MSFT'],
      [utcDate('2026-03-15')],
      [],
    )

    expect(rows[0].isStale).toBe(true)
  })
})
