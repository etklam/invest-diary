/**
 * Admin: Create new ETF
 * Validates symbol against Yahoo Finance API before creating
 */

import { requireUser } from '~/server/utils/auth'
import adminMiddleware from '~/server/middleware/admin'
import { validateSymbol } from '~/lib/yahoo-finance'
import prisma from '~/lib/prisma'

export default defineEventHandler(async (event) => {
  requireUser(event)
  await adminMiddleware(event)

  const body = await readBody(event)
  const { symbol, name, skipValidation } = body

  if (!symbol || typeof symbol !== 'string') {
    throw createError({
      statusCode: 400,
      statusMessage: 'Invalid symbol',
    })
  }

  const normalizedSymbol = symbol.toUpperCase().trim()

  // Check if ETF already exists
  const existing = await prisma.etf.findUnique({
    where: { symbol: normalizedSymbol },
  })

  if (existing) {
    throw createError({
      statusCode: 409,
      statusMessage: 'ETF already exists',
    })
  }

  // Validate symbol against Yahoo Finance (unless skipValidation is true)
  if (!skipValidation) {
    try {
      const isValid = await validateSymbol(normalizedSymbol)
      if (!isValid) {
        throw createError({
          statusCode: 400,
          statusMessage: 'Invalid ETF symbol - not found on Yahoo Finance',
        })
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
        throw createError({
          statusCode: 429,
          statusMessage: 'Yahoo Finance rate limit exceeded. Please try again later or skip validation.',
        })
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

  return {
    id: etf.id.toString(),
    symbol: etf.symbol,
    name: etf.name,
    createdAt: etf.createdAt,
  }
})
