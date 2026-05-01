/**
 * Admin: Seed common ETFs
 * Adds popular ETFs without Yahoo validation
 */

import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'
import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'

// Common US ETFs
const COMMON_ETFS = [
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
  { symbol: 'XLC', name: 'Communication Services Select Sector SPDR Fund' },
  { symbol: 'EFA', name: 'iShares MSCI EAFE ETF' },
  { symbol: 'VWO', name: 'Vanguard Emerging Markets Stock Index ETF' },
  { symbol: 'IEMG', name: 'iShares Core MSCI Emerging Markets ETF' },
  { symbol: 'VT', name: 'Vanguard Total World Stock ETF' },
  { symbol: 'BND', name: 'Vanguard Total Bond Market ETF' },
  { symbol: 'LQD', name: 'iShares iBoxx $ Investment Grade Corporate Bond ETF' },
]

export default defineEventHandler(async (event) => {
  const log = logger.admin.withRequestId(event.context.requestId)
  requireUser(event)
  await adminMiddleware(event)

  const result = await prisma.etf.createMany({
    data: COMMON_ETFS,
    skipDuplicates: true,
  })
  const added = result.count
  const skipped = COMMON_ETFS.length - added

  // Get all ETFs count
  const totalCount = await prisma.etf.count()

  return {
    success: true,
    added,
    skipped,
    total: totalCount,
  }
})
