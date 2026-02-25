/**
 * ETF Analysis Types
 */

import type { Prisma } from '@prisma/client'

export interface EtfPriceData {
  date: Date
  open: Prisma.Decimal | number
  high: Prisma.Decimal | number
  low: Prisma.Decimal | number
  close: Prisma.Decimal | number
  adjClose: Prisma.Decimal | number
}

export interface QuoteData {
  symbol: string
  regularMarketPrice: number
  previousClose: number
  change: number
  changePercent: number
}

export type TrendType = 'bullish' | 'bearish' | 'neutral'

export interface MonthlyComparison {
  previousMonth: {
    price: number
    change: number
    changePercent: number
  }
  twoMonthsAgo: {
    price: number
    change: number
    changePercent: number
  }
}

export interface QuarterlyChange {
  change: number
  changePercent: number
}

export interface YearlyComparison {
  lastYearChange: number
  thisYearChange: number
  difference: number
  improved: boolean
}

export interface TechnicalIndicators {
  ma20: number
  ma60: number
  trend: TrendType
}

export interface YtdChange {
  change: number
  changePercent: number
}

export interface EtfAnalysis {
  symbol: string
  name: string | null
  currentPrice: number
  daily: {
    price: number
    change: number
    changePercent: number
  }
  monthly: MonthlyComparison
  quarterly: QuarterlyChange
  yearlyComparison: YearlyComparison | null
  technical: TechnicalIndicators
  ytd: YtdChange
}

/**
 * Convert Prisma Decimal to number
 */
function toNumber(value: Prisma.Decimal | number): number {
  return typeof value === 'number' ? value : value.toNumber()
}

function getFirstClose(prices: EtfPriceData[]): number | null {
  const first = prices.at(0)
  return first ? toNumber(first.close) : null
}

function getLastClose(prices: EtfPriceData[]): number | null {
  const last = prices.at(-1)
  return last ? toNumber(last.close) : null
}

/**
 * Calculate moving average for a given period
 */
function calculateMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null
  const slice = prices.slice(-period)
  const sum = slice.reduce((a, b) => a + b, 0)
  return sum / period
}

/**
 * Determine trend based on price vs moving averages
 */
function determineTrend(price: number, ma20: number | null, ma60: number | null): TrendType {
  if (!ma20 || !ma60) return 'neutral'

  if (price > ma20 && ma20 > ma60) return 'bullish'
  if (price < ma20 && ma20 < ma60) return 'bearish'
  return 'neutral'
}

/**
 * Calculate monthly comparison (current vs previous months)
 */
function calculateMonthlyComparison(
  currentDate: Date,
  prices: EtfPriceData[]
): MonthlyComparison {
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Previous month (last month of previous month or last year)
  const prevMonthDate = new Date(currentYear, currentMonth - 1, 1)
  const twoMonthsAgoDate = new Date(currentYear, currentMonth - 2, 1)

  // Find the closing price for each month (last data point of each month)
  const currentMonthPrices = prices.filter(p => {
    const d = new Date(p.date)
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear
  })

  const prevMonthPrices = prices.filter(p => {
    const d = new Date(p.date)
    return d.getMonth() === prevMonthDate.getMonth() && d.getFullYear() === prevMonthDate.getFullYear()
  })

  const twoMonthsAgoPrices = prices.filter(p => {
    const d = new Date(p.date)
    return d.getMonth() === twoMonthsAgoDate.getMonth() && d.getFullYear() === twoMonthsAgoDate.getFullYear()
  })

  // Get closing prices (last available price for each month)
  const currentPrice = getLastClose(currentMonthPrices)
  const prevMonthPrice = getLastClose(prevMonthPrices)
  const twoMonthsAgoPrice = getLastClose(twoMonthsAgoPrices)

  const previousMonth = {
    price: prevMonthPrice ?? 0,
    change: currentPrice !== null && prevMonthPrice !== null ? currentPrice - prevMonthPrice : 0,
    changePercent: currentPrice !== null && prevMonthPrice !== null && prevMonthPrice !== 0
      ? ((currentPrice - prevMonthPrice) / prevMonthPrice) * 100
      : 0,
  }

  const twoMonthsAgo = {
    price: twoMonthsAgoPrice ?? 0,
    change: currentPrice !== null && twoMonthsAgoPrice !== null ? currentPrice - twoMonthsAgoPrice : 0,
    changePercent: currentPrice !== null && twoMonthsAgoPrice !== null && twoMonthsAgoPrice !== 0
      ? ((currentPrice - twoMonthsAgoPrice) / twoMonthsAgoPrice) * 100
      : 0,
  }

  return { previousMonth, twoMonthsAgo }
}

/**
 * Calculate quarterly change (current quarter vs previous quarter)
 */
function calculateQuarterlyChange(currentDate: Date, prices: EtfPriceData[]): QuarterlyChange {
  const currentQuarter = Math.floor(currentDate.getMonth() / 3)
  const currentYear = currentDate.getFullYear()

  // Previous quarter
  const prevQuarter = currentQuarter === 0 ? 3 : currentQuarter - 1
  const prevQuarterYear = currentQuarter === 0 ? currentYear - 1 : currentYear

  // Filter prices for current quarter and previous quarter
  const currentQuarterPrices = prices.filter(p => {
    const d = new Date(p.date)
    const q = Math.floor(d.getMonth() / 3)
    return q === currentQuarter && d.getFullYear() === currentYear
  })

  const prevQuarterPrices = prices.filter(p => {
    const d = new Date(p.date)
    const q = Math.floor(d.getMonth() / 3)
    return q === prevQuarter && d.getFullYear() === prevQuarterYear
  })

  // Get first and last prices for each quarter
  const currentQuarterLast = getLastClose(currentQuarterPrices)
  const prevQuarterLast = getLastClose(prevQuarterPrices)

  // Calculate change from previous quarter end to current quarter end
  const change = (currentQuarterLast ?? 0) - (prevQuarterLast ?? 0)
  const changePercent = prevQuarterLast && prevQuarterLast > 0
    ? ((currentQuarterLast ?? 0) - prevQuarterLast) / prevQuarterLast * 100
    : 0

  return { change, changePercent }
}

/**
 * Calculate year-to-date (YTD) change
 */
function calculateYtdChange(currentDate: Date, prices: EtfPriceData[]): YtdChange {
  const currentYear = currentDate.getFullYear()

  // First trading day of the year (last December's close or first January)
  const lastYearPrices = prices.filter(p => {
    const d = new Date(p.date)
    return d.getFullYear() === currentYear - 1
  })

  const currentYearPrices = prices.filter(p => {
    const d = new Date(p.date)
    return d.getFullYear() === currentYear
  })

  // Use last December's close as starting point, or first January
  const startPrice = getLastClose(lastYearPrices) ?? getFirstClose(currentYearPrices) ?? 0
  const currentPrice = getLastClose(currentYearPrices) ?? startPrice

  const change = currentPrice - startPrice
  const changePercent = startPrice > 0 ? (change / startPrice) * 100 : 0

  return { change, changePercent }
}

/**
 * Calculate yearly comparison (same period last year vs this year)
 * Compares the change from March to April this year vs March to April last year
 */
function calculateYearlyComparison(currentDate: Date, prices: EtfPriceData[]): YearlyComparison | null {
  const currentYear = currentDate.getFullYear()
  const currentMonth = currentDate.getMonth()

  // Compare 2-month period: current month + previous month
  const thisYearPrices = prices.filter(p => {
    const d = new Date(p.date)
    return d.getFullYear() === currentYear && d.getMonth() >= currentMonth - 1 && d.getMonth() <= currentMonth
  })

  const lastYearPrices = prices.filter(p => {
    const d = new Date(p.date)
    return d.getFullYear() === currentYear - 1 && d.getMonth() >= currentMonth - 1 && d.getMonth() <= currentMonth
  })

  if (thisYearPrices.length < 2 || lastYearPrices.length < 2) {
    return null
  }

  const thisYearFirst = getFirstClose(thisYearPrices)
  const thisYearLast = getLastClose(thisYearPrices)
  if (thisYearFirst === null || thisYearLast === null || thisYearFirst === 0) {
    return null
  }
  const thisYearChange = ((thisYearLast - thisYearFirst) / thisYearFirst) * 100

  const lastYearFirst = getFirstClose(lastYearPrices)
  const lastYearLast = getLastClose(lastYearPrices)
  if (lastYearFirst === null || lastYearLast === null || lastYearFirst === 0) {
    return null
  }
  const lastYearChange = ((lastYearLast - lastYearFirst) / lastYearFirst) * 100

  return {
    lastYearChange,
    thisYearChange,
    difference: thisYearChange - lastYearChange,
    improved: thisYearChange > lastYearChange,
  }
}

/**
 * Calculate technical indicators
 */
function calculateTechnicalIndicators(prices: EtfPriceData[]): TechnicalIndicators {
  const closePrices = prices.map(p => toNumber(p.close))

  const ma20 = calculateMA(closePrices, 20)
  const ma60 = calculateMA(closePrices, 60)

  const currentPrice = closePrices[closePrices.length - 1] ?? 0
  const trend = determineTrend(currentPrice, ma20, ma60)

  return {
    ma20: ma20 ?? 0,
    ma60: ma60 ?? 0,
    trend,
  }
}

/**
 * Analyze ETF data
 */
export function analyzeEtf(
  symbol: string,
  name: string | null,
  prices: EtfPriceData[],
  quote: QuoteData | null,
  currentDate: Date = new Date()
): EtfAnalysis {
  const sortedPrices = [...prices].sort((a, b) =>
    new Date(a.date).getTime() - new Date(b.date).getTime()
  )

  const latestClose = getLastClose(sortedPrices) ?? 0
  const currentPrice = quote?.regularMarketPrice ?? latestClose

  const daily = quote
    ? {
        price: quote.regularMarketPrice,
        change: quote.change,
        changePercent: quote.changePercent,
      }
    : {
        price: currentPrice,
        change: 0,
        changePercent: 0,
      }

  return {
    symbol,
    name,
    currentPrice,
    daily,
    monthly: calculateMonthlyComparison(currentDate, sortedPrices),
    quarterly: calculateQuarterlyChange(currentDate, sortedPrices),
    yearlyComparison: calculateYearlyComparison(currentDate, sortedPrices),
    technical: calculateTechnicalIndicators(sortedPrices),
    ytd: calculateYtdChange(currentDate, sortedPrices),
  }
}

/**
 * Analyze multiple ETFs
 */
export async function analyzeMultipleEtfs(
  etfs: Array<{ symbol: string; name: string | null; prices: EtfPriceData[] }>,
  quoteFetcher: (symbol: string) => Promise<QuoteData>
): Promise<EtfAnalysis[]> {
  const results = await Promise.allSettled(
    etfs.map(async (etf) => {
      const quote = etf.prices.length > 0
        ? await quoteFetcher(etf.symbol).catch(() => null)
        : null
      return analyzeEtf(etf.symbol, etf.name, etf.prices, quote)
    })
  )

  return results
    .filter((r): r is PromiseFulfilledResult<EtfAnalysis> => r.status === 'fulfilled')
    .map(r => r.value)
}
