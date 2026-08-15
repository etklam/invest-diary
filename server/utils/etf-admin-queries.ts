import { z } from 'zod'
import prisma from '~/lib/prisma'
import { AppError, Errors } from '~/lib/errors/factory'
import { isYahooRateLimitError } from '~/lib/market-data/daily-prices'
import { fetchMonthlyData, validateSymbol } from '~/lib/yahoo-finance'

const ADMIN_ETF_INCLUDE = {
  _count: {
    select: {
      prices: true,
      watchlists: true,
    },
  },
} as const

const optionalName = z.union([
  z.string().trim().max(255),
  z.null(),
  z.undefined(),
]).transform(value => value || null)

export const AdminEtfCreateSchema = z.object({
  symbol: z.string()
    .trim()
    .min(1, 'Symbol is required')
    .max(20, 'Symbol must be at most 20 characters')
    .transform(value => value.toUpperCase()),
  name: optionalName,
  skipValidation: z.boolean().optional().default(false),
})

export type AdminEtfCreateInput = z.infer<typeof AdminEtfCreateSchema>

export const COMMON_ETFS = [
  { symbol: 'SPY', name: 'SPDR S&P 500 ETF Trust' },
  { symbol: 'QQQ', name: 'Invesco QQQ Trust' },
  { symbol: 'IWM', name: 'iShares Russell 2000 ETF' },
  { symbol: 'VTI', name: 'Vanguard Total Stock Market ETF' },
  { symbol: 'VOO', name: 'Vanguard S&P 500 ETF' },
  { symbol: 'GLD', name: 'SPDR Gold Shares' },
  { symbol: 'TLT', name: 'iShares 20+ Year Treasury Bond ETF' },
  { symbol: 'XLE', name: 'Energy Select Sector SPDR Fund' },
  { symbol: 'XLK', name: 'Technology Select Sector SPDR Fund' },
  { symbol: 'XLF', name: 'Financial Select Sector SPDR Fund' },
  { symbol: 'XLV', name: 'Health Care Select Sector SPDR Fund' },
  { symbol: 'XLI', name: 'Industrial Select Sector SPDR Fund' },
  { symbol: 'XLY', name: 'Consumer Discretionary Select Sector SPDR Fund' },
  { symbol: 'XLP', name: 'Consumer Staples Select Sector SPDR Fund' },
  { symbol: 'XLRE', name: 'Real Estate Select Sector SPDR Fund' },
  { symbol: 'XLB', name: 'Materials Select Sector SPDR Fund' },
  { symbol: 'XLU', name: 'Utilities Select Sector SPDR Fund' },
  { symbol: 'XLC', name: 'Communication Services ETF' },
  { symbol: 'EFA', name: 'iShares MSCI EAFE ETF' },
  { symbol: 'VWO', name: 'Vanguard Emerging Markets Stock Index ETF' },
  { symbol: 'IEMG', name: 'iShares Core MSCI Emerging Markets ETF' },
  { symbol: 'VT', name: 'Vanguard Total World Stock ETF' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF' },
  { symbol: 'LQD', name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF' },
] as const

function throwExternalServiceError(error: unknown): never {
  if (error instanceof AppError) throw error
  if (isYahooRateLimitError(error)) throw Errors.rateLimited()
  throw Errors.externalServiceError('Failed to fetch historical data from Yahoo Finance')
}

export async function listAdminEtfs() {
  return prisma.etf.findMany({
    include: ADMIN_ETF_INCLUDE,
    orderBy: { symbol: 'asc' },
  })
}

export async function createAdminEtf(input: AdminEtfCreateInput) {
  const existing = await prisma.etf.findUnique({
    where: { symbol: input.symbol },
  })

  if (existing) {
    throw Errors.etfAlreadyInWatchlist(input.symbol)
  }

  if (!input.skipValidation) {
    try {
      const isValid = await validateSymbol(input.symbol)
      if (!isValid) {
        throw Errors.validationError([{
          field: 'symbol',
          message: 'Invalid ETF symbol - not found on Yahoo Finance',
        }])
      }
    } catch (error) {
      if (error instanceof AppError) throw error
      if (isYahooRateLimitError(error)) throw Errors.rateLimited()
      throw error
    }
  }

  return prisma.etf.create({
    data: {
      symbol: input.symbol,
      name: input.name,
    },
  })
}

export async function deleteAdminEtf(etfId: bigint) {
  const etf = await prisma.etf.findUnique({
    where: { id: etfId },
    include: ADMIN_ETF_INCLUDE,
  })

  if (!etf) {
    throw Errors.etfNotFound(String(etfId))
  }

  await prisma.etf.delete({ where: { id: etfId } })

  return {
    deletedPrices: etf._count.prices,
    deletedWatchlists: etf._count.watchlists,
  }
}

export async function initializeAdminEtf(etfId: bigint) {
  const etf = await prisma.etf.findUnique({
    where: { id: etfId },
  })

  if (!etf) {
    throw Errors.etfNotFound(String(etfId))
  }

  let monthlyData
  try {
    monthlyData = await fetchMonthlyData(etf.symbol, 5)
  } catch (error) {
    throwExternalServiceError(error)
  }

  const prices = monthlyData
    .filter((data): data is typeof data & { close: number } => data.close !== null)
    .map(data => ({
      etfId,
      date: new Date(data.timestamp * 1000),
      open: data.open ?? data.close,
      high: data.high ?? data.close,
      low: data.low ?? data.close,
      close: data.close,
      adjClose: data.adjClose ?? data.close,
      volume: data.volume ?? null,
    }))

  if (prices.length === 0) {
    throw Errors.externalServiceError('No historical data available from Yahoo Finance')
  }

  const firstPrice = prices[0]
  const lastPrice = prices[prices.length - 1]
  if (!firstPrice || !lastPrice) {
    throw Errors.externalServiceError('No historical data available from Yahoo Finance')
  }

  let result
  try {
    result = await prisma.etfPrice.createMany({
      data: prices,
      skipDuplicates: true,
    })
  } catch (error) {
    throwExternalServiceError(error)
  }

  return {
    added: result.count,
    total: prices.length,
    symbol: etf.symbol,
    dateRange: {
      from: firstPrice.date.toISOString().split('T')[0],
      to: lastPrice.date.toISOString().split('T')[0],
    },
  }
}

export async function seedAdminEtfs() {
  const result = await prisma.etf.createMany({
    data: COMMON_ETFS,
    skipDuplicates: true,
  })
  const total = await prisma.etf.count()

  return {
    added: result.count,
    skipped: COMMON_ETFS.length - result.count,
    total,
  }
}
