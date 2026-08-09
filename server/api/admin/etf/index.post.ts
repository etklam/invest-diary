/**
 * Admin: Create new ETF
 * Validates symbol against Yahoo Finance API before creating
 */

import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'
import { validateSymbol } from '~/lib/yahoo-finance'
import prisma from '~/lib/prisma'
import { Errors } from '~/lib/errors/factory'
import { serialize } from '~/server/utils/serialize'

export default defineEventHandler(async (event) => {
  requireUser(event)
  await adminMiddleware(event)

  const body = await readBody(event)
  const { symbol, name, skipValidation } = body

  if (!symbol || typeof symbol !== 'string') {
    throw Errors.validationError([{ field: 'symbol', message: 'Invalid symbol' }]).toH3Error()
  }

  const normalizedSymbol = symbol.toUpperCase().trim()

  // Check if ETF already exists
  const existing = await prisma.etf.findUnique({
    where: { symbol: normalizedSymbol },
  })

  if (existing) {
    throw Errors.etfAlreadyInWatchlist(normalizedSymbol).toH3Error()
  }

  // Validate symbol against Yahoo Finance (unless skipValidation is true)
  if (!skipValidation) {
    try {
      const isValid = await validateSymbol(normalizedSymbol)
      if (!isValid) {
        throw Errors.validationError([{ field: 'symbol', message: 'Invalid ETF symbol - not found on Yahoo Finance' }]).toH3Error()
      }
    } catch (error: unknown) {
      // If Yahoo API fails, allow user to retry or skip validation
      if (
        error
        && typeof error === 'object'
        && (
          ('statusCode' in error && error.statusCode === 429)
          || ('message' in error && typeof error.message === 'string' && error.message.includes('Too Many Requests'))
        )
      ) {
        throw Errors.rateLimited().toH3Error()
      }
      throw error
    }
  }

  // Create ETF
  const etf = await prisma.etf.create({
    data: {
      symbol: normalizedSymbol,
      name: name || null,
    },
  })

  return serialize({
    id: etf.id,
    symbol: etf.symbol,
    name: etf.name,
    createdAt: etf.createdAt,
  })
})
