import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  fetchDailyOhlcv,
  isYahooRateLimitError,
  persistDailyPrices,
  type DailyPricePrisma,
  type DailyPriceInput,
} from '~/lib/market-data/daily-prices'

function makePrice(overrides: Partial<DailyPriceInput> = {}): DailyPriceInput {
  return {
    symbol: 'AAPL',
    date: new Date('2026-08-14T00:00:00.000Z'),
    open: 100,
    high: 110,
    low: 95,
    close: 105,
    adjustedClose: 104.5,
    volume: 1234n,
    ...overrides,
  }
}

describe('daily price seam', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-08-15T08:30:00.000Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fetches, normalizes, and parses daily OHLCV through the shared chart client', async () => {
    const chart = vi.fn().mockResolvedValue({
      quotes: [{
        date: new Date('2026-08-14T12:34:56.000Z'),
        open: 100,
        high: 110,
        low: 95,
        close: 105,
        adjclose: 104.5,
        volume: 1234.9,
      }],
    })

    await expect(fetchDailyOhlcv(' spx ', '1mo', { chart })).resolves.toEqual([
      makePrice({
        symbol: ' spx ',
        date: new Date('2026-08-14T00:00:00.000Z'),
      }),
    ])

    expect(chart).toHaveBeenCalledWith('^GSPC', {
      period1: new Date('2026-07-15T08:30:00.000Z'),
      period2: new Date('2026-08-15T08:30:00.000Z'),
      interval: '1d',
      return: 'array',
    })
  })

  it('persists both new and conflicting rows through the same upsert contract', async () => {
    const rows = new Map<string, DailyPriceInput>()
    const upsert = vi.fn(async ({ where, update, create }: Parameters<DailyPricePrisma['marketDailyPrice']['upsert']>[0]) => {
      const key = `${where.symbol_date.symbol}:${where.symbol_date.date.toISOString()}`
      const existing = rows.get(key)
      rows.set(key, {
        ...(existing ?? create),
        ...(existing ? update : create),
      })
      return existing ? { id: 1n } : { id: 2n }
    })
    const prisma = { marketDailyPrice: { upsert } }
    const first = makePrice()
    const second = makePrice({ close: 106, adjustedClose: 105.5, volume: 2000n })

    await persistDailyPrices(prisma, [first])
    await persistDailyPrices(prisma, [second])

    expect(rows.get('AAPL:2026-08-14T00:00:00.000Z')).toMatchObject(second)
    expect(upsert).toHaveBeenCalledTimes(2)
    expect(upsert).toHaveBeenLastCalledWith({
      where: {
        symbol_date: {
          symbol: 'AAPL',
          date: new Date('2026-08-14T00:00:00.000Z'),
        },
      },
      update: {
        open: 100,
        high: 110,
        low: 95,
        close: 106,
        adjustedClose: 105.5,
        volume: 2000n,
      },
      create: second,
    })
  })

  it.each([
    new Error('Yahoo rate limit exceeded'),
    new Error('HTTP 429 Too Many Requests'),
    { statusCode: 429 },
  ])('classifies Yahoo rate-limit error: %s', (error) => {
    expect(isYahooRateLimitError(error)).toBe(true)
  })

  it('does not classify permanent Yahoo symbol errors as rate limits', () => {
    expect(isYahooRateLimitError(new Error('Symbol not found'))).toBe(false)
  })
})
