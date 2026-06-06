import { describe, expect, it } from 'vitest'
import {
  buildYahooChartUrl,
  getYahooSymbolAliasSuggestion,
  normalizeYahooSymbol,
  parseYahooLibraryDailyQuotes,
  parseYahooLibraryMonthlyQuotes,
  parseYahooLibraryQuote,
  parseYahooMonthlyQuotes,
  parseYahooRegularMarketPrice,
} from '~/lib/market-data/yahoo'
import { buildTwseQuoteUrl, normalizeTwseSymbol, parseTwseQuotePrice } from '~/lib/market-data/twse'

describe('market data providers', () => {
  it('builds canonical provider URLs', () => {
    expect(buildYahooChartUrl('AAPL', { interval: '1d', range: '1d' }))
      .toBe('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d')
    expect(buildTwseQuoteUrl('2330.TW'))
      .toBe('https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_2330.tw')
  })

  it('normalizes common yahoo index aliases', () => {
    expect(normalizeYahooSymbol('spx')).toBe('^GSPC')
    expect(normalizeYahooSymbol(' dji ')).toBe('^DJI')
    expect(getYahooSymbolAliasSuggestion('spx')).toBe('^GSPC')
    expect(getYahooSymbolAliasSuggestion('QQQ')).toBeNull()
    expect(normalizeYahooSymbol('QQQ')).toBe('QQQ')
    expect(buildYahooChartUrl('SPX', { interval: '1d', range: '1d' }))
      .toBe('https://query1.finance.yahoo.com/v8/finance/chart/%5EGSPC?interval=1d&range=1d')
  })

  it('normalizes TWSE symbols and parses realtime text payloads', () => {
    expect(normalizeTwseSymbol('2330.tw')).toBe('2330')
    expect(parseTwseQuotePrice('prefix{"msgArray":[{"z":"123.45"}]}')).toBe(123.45)
    expect(parseTwseQuotePrice('{"msgArray":[{"z":"-"}]}')).toBeNull()
  })

  it('extracts yahoo quote and monthly chart data from a shared parser', () => {
    const response = {
      chart: {
        result: [
          {
            meta: {
              symbol: 'SPY',
              regularMarketPrice: 612.34,
              previousClose: 600,
              currency: 'USD',
              marketState: 'REGULAR',
              regularMarketTime: 1710000000,
            },
            timestamp: [1700000000, 1702600000],
            indicators: {
              quote: [
                {
                  open: [100, 110],
                  high: [120, 130],
                  low: [90, 100],
                  close: [115, 125],
                  volume: [1000, 2000],
                },
              ],
              adjclose: [
                {
                  adjclose: [114, 124],
                },
              ],
            },
          },
        ],
        error: null,
      },
    }

    expect(parseYahooRegularMarketPrice(response)).toBe(612.34)
    expect(parseYahooMonthlyQuotes(response)).toEqual([
      {
        timestamp: 1700000000,
        open: 100,
        high: 120,
        low: 90,
        close: 115,
        volume: 1000,
        adjClose: 114,
      },
      {
        timestamp: 1702600000,
        open: 110,
        high: 130,
        low: 100,
        close: 125,
        volume: 2000,
        adjClose: 124,
      },
    ])
  })

  it('maps yahoo-finance2 quote data into app quote shape', () => {
    expect(parseYahooLibraryQuote({
      symbol: '^GSPC',
      regularMarketPrice: 5100,
      regularMarketPreviousClose: 5000,
      currency: 'USD',
      marketState: 'REGULAR',
      regularMarketTime: new Date('2026-04-02T00:00:00.000Z'),
    })).toEqual({
      symbol: '^GSPC',
      regularMarketPrice: 5100,
      previousClose: 5000,
      change: 100,
      changePercent: 2,
      currency: 'USD',
      marketState: 'REGULAR',
      lastUpdateTime: '2026-04-02T00:00:00.000Z',
    })
  })

  it('maps yahoo-finance2 chart quotes into daily and monthly app shapes', () => {
    const quotes = [
      {
        date: new Date('2026-01-01T00:00:00.000Z'),
        open: 100,
        high: 120,
        low: 90,
        close: 115,
        volume: 1000,
        adjclose: 114,
      },
      {
        date: new Date('2026-02-01T00:00:00.000Z'),
        open: 110,
        high: 130,
        low: 100,
        close: 125,
        volume: 2000,
        adjclose: 124,
      },
    ]

    expect(parseYahooLibraryDailyQuotes(quotes)).toEqual([
      { timestamp: 1767225600, close: 115 },
      { timestamp: 1769904000, close: 125 },
    ])

    expect(parseYahooLibraryMonthlyQuotes(quotes)).toEqual([
      {
        timestamp: 1767225600,
        open: 100,
        high: 120,
        low: 90,
        close: 115,
        volume: 1000,
        adjClose: 114,
      },
      {
        timestamp: 1769904000,
        open: 110,
        high: 130,
        low: 100,
        close: 125,
        volume: 2000,
        adjClose: 124,
      },
    ])
  })

})
