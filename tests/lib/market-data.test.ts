import { describe, expect, it, vi } from 'vitest'
import { buildYahooChartUrl, parseYahooMonthlyQuotes, parseYahooRegularMarketPrice } from '~/lib/market-data/yahoo'
import { fetchMarketPrice } from '~/lib/market-data/quotes'
import { buildTwseQuoteUrl, normalizeTwseSymbol, parseTwseQuotePrice } from '~/lib/market-data/twse'

describe('market data providers', () => {
  it('builds canonical provider URLs', () => {
    expect(buildYahooChartUrl('AAPL', { interval: '1d', range: '1d' }))
      .toBe('https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d')
    expect(buildTwseQuoteUrl('2330.TW'))
      .toBe('https://mis.twse.com.tw/stock/api/getStockInfo.jsp?ex_ch=tse_2330.tw')
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

  it('uses one provider strategy for stock price lookup', async () => {
    const fetchYahooPrice = vi.fn().mockResolvedValue(210.5)
    const fetchTwsePrice = vi.fn().mockResolvedValue(999)

    await expect(fetchMarketPrice('2330.TW', {
      fetchYahooPrice,
      fetchTwsePrice,
    })).resolves.toBe(999)

    await expect(fetchMarketPrice('AAPL', {
      fetchYahooPrice,
      fetchTwsePrice,
    })).resolves.toBe(210.5)

    expect(fetchTwsePrice).toHaveBeenCalledWith('2330.TW')
    expect(fetchYahooPrice).toHaveBeenCalledWith('AAPL')
  })
})
