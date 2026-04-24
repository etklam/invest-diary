import { describe, expect, it } from 'vitest'
import { buildSpxSessionSummary, classifyMarketSession } from '~/lib/quicknote/market-session'

describe('quicknote market session helpers', () => {
  it('classifies strong and modest index moves', () => {
    expect(classifyMarketSession({
      previousClose: 100,
      open: 100.2,
      close: 101.4,
    })).toBe('strongUp')

    expect(classifyMarketSession({
      previousClose: 100,
      open: 99.9,
      close: 100.45,
    })).toBe('slightUp')
  })

  it('classifies opening gap patterns before plain percentage moves', () => {
    expect(classifyMarketSession({
      previousClose: 100,
      open: 99.4,
      close: 100.2,
    })).toBe('gapDownRecovery')

    expect(classifyMarketSession({
      previousClose: 100,
      open: 100.6,
      close: 99.9,
    })).toBe('gapUpFade')
  })

  it('builds an SPX session summary from the latest intraday session', () => {
    const summary = buildSpxSessionSummary(
      {
        symbol: '^GSPC',
        regularMarketPrice: 5008,
        previousClose: 5000,
        change: 8,
        changePercent: 0.16,
        currency: 'USD',
        marketState: 'REGULAR',
        lastUpdateTime: '2026-04-24T20:00:00.000Z',
      },
      [
        { timestamp: 1776989400, open: 4990, high: 4995, low: 4985, close: 4992, volume: null },
        { timestamp: 1777075800, open: 4975, high: 5010, low: 4970, close: 5008, volume: null },
      ]
    )

    expect(summary.symbol).toBe('SPX')
    expect(summary.sourceSymbol).toBe('^GSPC')
    expect(summary.open).toBe(4975)
    expect(summary.condition).toBe('gapDownRecovery')
    expect(summary.changePercent).toBeCloseTo(0.16)
  })
})
