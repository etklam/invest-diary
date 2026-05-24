/**
 * Sector Board API
 * Aggregated endpoint that returns pre-computed SectorTrendRow[] for the ETF Sector Trend Board.
 * Caches entire board results to reduce Yahoo Finance API calls.
 */

import { fetchHistoricalData, fetchQuote } from '~/lib/yahoo-finance'
import type { QuoteResponse } from '~/lib/yahoo-finance'
import { rateLimiters } from '~/lib/rate-limiter'
import { Errors } from '~/lib/errors/factory'
import {
  buildMarketHistoricalCacheKey,
  buildMarketQuoteCacheKey,
  getBoardCacheTtlSeconds,
  getMarketDataCacheTtlSeconds,
  getCached,
  getOrSetCached,
  setCached,
  shouldBypassCache,
} from '~/lib/etf-profile/cache'
import {
  buildSectorTrendRow,
  buildFallbackSectorTrendRow,
  type PresetEtf,
  type SectorTrendRow,
} from '~/lib/etf-sector-trend'

const PRESET_LISTS: Record<string, PresetEtf[]> = {
  sectors: [
    { symbol: 'XLK', sector: 'Tech' },
    { symbol: 'SPY', sector: 'S&P 500' },
    { symbol: 'MAGS', sector: 'Mag 7' },
    { symbol: 'QQQE', sector: 'Nasdaq Equal Weight' },
    { symbol: 'XLE', sector: 'Energy' },
    { symbol: 'XLP', sector: 'Staples' },
    { symbol: 'XLC', sector: 'Communication' },
    { symbol: 'RSP', sector: 'S&P 500 Equal Weight' },
    { symbol: 'XLI', sector: 'Industrial' },
    { symbol: 'XLV', sector: 'Health Care' },
    { symbol: 'XLY', sector: 'Cyclical' },
    { symbol: 'XLF', sector: 'Financial' },
    { symbol: 'VNQ', sector: 'REITs' },
    { symbol: 'XLB', sector: 'Materials' },
    { symbol: 'XLU', sector: 'Utilities' },
  ],
  indexes: [
    { symbol: 'SPY', sector: 'S&P 500' },
    { symbol: 'QQQ', sector: 'Nasdaq 100' },
    { symbol: 'DIA', sector: 'Dow Jones' },
    { symbol: 'IWM', sector: 'Russell 2000' },
    { symbol: 'RSP', sector: 'S&P 500 Equal Weight' },
    { symbol: 'VTI', sector: 'US Total Market' },
    { symbol: 'VEA', sector: 'Developed ex-US' },
    { symbol: 'VWO', sector: 'Emerging Markets' },
  ],
}

const MAX_CUSTOM_SYMBOLS = 20
const CONCURRENCY_LIMIT = 4

function resolvePresetList(preset: string, symbols?: string): PresetEtf[] {
  if (preset === 'custom') {
    if (!symbols) return []
    return symbols
      .split(/[\s,]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean)
      .slice(0, MAX_CUSTOM_SYMBOLS)
      .map(symbol => ({ symbol, sector: 'Custom' }))
  }

  return PRESET_LISTS[preset] ?? []
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, mapper: (item: T) => Promise<R>): Promise<R[]> {
  const results: R[] = []
  let nextIndex = 0

  async function worker() {
    while (nextIndex < items.length) {
      const currentIndex = nextIndex
      nextIndex += 1
      const item = items[currentIndex]
      if (item !== undefined) {
        results[currentIndex] = await mapper(item)
      }
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker))
  return results
}

async function fetchTrendRow(etf: PresetEtf): Promise<SectorTrendRow> {
  try {
    const [history, quote] = await Promise.all([
      getOrSetCached(
        buildMarketHistoricalCacheKey(etf.symbol, '1y'),
        getMarketDataCacheTtlSeconds('historical'),
        () => fetchHistoricalData(etf.symbol, '1y'),
      ),
      getOrSetCached<QuoteResponse | null>(
        buildMarketQuoteCacheKey(etf.symbol),
        getMarketDataCacheTtlSeconds('quote'),
        () => fetchQuote(etf.symbol).catch(() => null),
      ),
    ])

    return buildSectorTrendRow(etf, history, quote)
  } catch (error) {
    return buildFallbackSectorTrendRow(etf, error instanceof Error ? error.message : 'Data unavailable')
  }
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event) || {}
  const preset = String(query.preset ?? 'sectors')
  const nocache = shouldBypassCache(query.nocache)

  if (preset !== 'sectors' && preset !== 'indexes' && preset !== 'custom') {
    throw Errors.validationError([{ field: 'preset', message: 'Must be sectors, indexes, or custom' }]).toH3Error()
  }

  const symbols = preset === 'custom' ? String(query.symbols ?? '') : undefined
  const etfList = resolvePresetList(preset, symbols)

  if (etfList.length === 0) {
    return { rows: [] }
  }

  const ip = getRequestIP(event) || 'unknown'
  try {
    await rateLimiters.yahooFinance(ip)
  } catch {
    throw Errors.rateLimited().toH3Error()
  }

  // Custom preset or nocache: no board-level cache
  if (preset === 'custom' || nocache) {
    const rows = await mapWithConcurrency(etfList, CONCURRENCY_LIMIT, fetchTrendRow)
    return { rows }
  }

  // Board-level cache for sectors/indexes
  const cacheKey = `board:${preset}`

  const cached = getCached<SectorTrendRow[]>(cacheKey)
  if (cached !== null) {
    return { rows: cached }
  }

  const rows = await mapWithConcurrency(etfList, CONCURRENCY_LIMIT, fetchTrendRow)
  const allFailed = rows.length > 0 && rows.every(row => Boolean(row.error))
  const ttlSeconds = getBoardCacheTtlSeconds(allFailed)
  setCached(cacheKey, rows, ttlSeconds)

  return { rows }
})
