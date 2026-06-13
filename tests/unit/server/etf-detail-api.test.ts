import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mockGetRouterParam } from '../../vi-setup'
import { clearCache } from '~/lib/market-data/cache'

const mockGetRequestIP = vi.fn()
const mockGeneralApiLimiter = vi.fn()
const mockFetchQuote = vi.fn()
const mockFetchMonthlyData = vi.fn()
const mockAnalyzeEtf = vi.fn()
const mockEtfFindUnique = vi.fn()

vi.stubGlobal('getRequestIP', mockGetRequestIP)

vi.mock('~/lib/rate-limiter', () => ({
  rateLimiters: {
    generalApi: mockGeneralApiLimiter,
  },
}))

vi.mock('~/lib/yahoo-finance', () => ({
  fetchQuote: mockFetchQuote,
  fetchMonthlyData: mockFetchMonthlyData,
}))

vi.mock('~/lib/etf-analyzer', () => ({
  analyzeEtf: mockAnalyzeEtf,
}))

vi.mock('~/lib/prisma', () => ({
  default: {
    etf: {
      findUnique: mockEtfFindUnique,
    },
  },
}))

function makeEtfRow(symbol: string, priceCount = 3) {
  return {
    symbol,
    name: `${symbol} ETF`,
    prices: Array.from({ length: priceCount }, (_, i) => ({
      date: new Date(`2026-0${i + 1}-01`),
      open: 100 + i,
      high: 110 + i,
      low: 90 + i,
      close: 105 + i,
      adjClose: 104 + i,
    })),
  }
}

describe('GET /api/etf/[symbol]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearCache()
    mockGetRouterParam.mockReturnValue('SPY')
    mockGetRequestIP.mockReturnValue('127.0.0.1')
    mockGeneralApiLimiter.mockResolvedValue(undefined)
    mockFetchQuote.mockResolvedValue({
      symbol: 'SPY',
      regularMarketPrice: 500,
      previousClose: 495,
      change: 5,
      changePercent: 1.0,
    })
    mockFetchMonthlyData.mockResolvedValue([
      { timestamp: 1700000000, open: 400, high: 410, low: 390, close: 405, adjClose: 404 },
    ])
    mockAnalyzeEtf.mockImplementation((_symbol, _name, _prices, quote) => ({
      symbol: _symbol,
      name: _name,
      quote,
      analyzed: true,
    }))
  })

  it('uses DB seed and returns analyzeEtf result, fetching quote once', async () => {
    mockEtfFindUnique.mockResolvedValue(makeEtfRow('SPY'))
    const { default: handler } = await import('~/server/api/etf/[symbol]/index.get')

    const result = await handler({ context: {} } as any)

    expect(mockEtfFindUnique).toHaveBeenCalledWith(expect.objectContaining({
      where: { symbol: 'SPY' },
    }))
    expect(mockFetchQuote).toHaveBeenCalledWith('SPY')
    expect(mockFetchQuote).toHaveBeenCalledTimes(1)
    expect(mockFetchMonthlyData).not.toHaveBeenCalled()
    expect(result).toMatchObject({ symbol: 'SPY', analyzed: true })
  })

  it('falls back to Yahoo monthly data when DB has no ETF row', async () => {
    mockEtfFindUnique.mockResolvedValue(null)
    const { default: handler } = await import('~/server/api/etf/[symbol]/index.get')

    const result = await handler({ context: {} } as any)

    expect(mockFetchMonthlyData).toHaveBeenCalledWith('SPY', 5)
    expect(mockFetchQuote).toHaveBeenCalledWith('SPY')
    expect(result).toMatchObject({ symbol: 'SPY', analyzed: true })
  })

  it('continues with null quote when fetchQuote rejects', async () => {
    mockEtfFindUnique.mockResolvedValue(null)
    mockFetchQuote.mockRejectedValue(new Error('Yahoo down'))
    const { default: handler } = await import('~/server/api/etf/[symbol]/index.get')

    const result = await handler({ context: {} } as any)

    expect(mockFetchMonthlyData).toHaveBeenCalled()
    expect(result).toMatchObject({ symbol: 'SPY', analyzed: true, quote: null })
  })

  it('serves the second DB-path call from cache without re-hitting fetchQuote', async () => {
    mockEtfFindUnique.mockResolvedValue(makeEtfRow('SPY'))
    const { default: handler } = await import('~/server/api/etf/[symbol]/index.get')

    await handler({ context: {} } as any)
    await handler({ context: {} } as any)

    expect(mockFetchQuote).toHaveBeenCalledTimes(1)
  })

  it('throws 404 when fallback monthly data is empty', async () => {
    mockEtfFindUnique.mockResolvedValue(null)
    mockFetchMonthlyData.mockResolvedValue([])
    const { default: handler } = await import('~/server/api/etf/[symbol]/index.get')

    await expect(handler({ context: {} } as any)).rejects.toMatchObject({
      statusCode: 404,
    })
  })
})
