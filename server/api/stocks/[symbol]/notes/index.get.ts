import prisma from '~/lib/prisma'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { listStockNotes, toStockNoteResponse } from '~/lib/stocks/notes'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { getPartnerSide, type PartnerLinkRecord } from '~/server/utils/partner'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const symbol = decodeURIComponent(String(event.context.params?.symbol))
    const query = getQuery(event)
    const page = Math.max(1, parseInt(String(query.page || '1'), 10) || 1)
    const limit = Math.min(100, Math.max(1, parseInt(String(query.limit || '20'), 10) || 20))
    const partnerId = query.partnerId ? String(query.partnerId) : undefined
    const createdVia = !partnerId && (query.createdVia === 'USER' || query.createdVia === 'AGENT')
      ? query.createdVia as 'USER' | 'AGENT'
      : undefined

    const stockSymbol = normalizeStockSymbol(symbol)
    const stock = await prisma.stock.findUnique({ where: { symbol: stockSymbol }, select: { id: true } })
    if (!stock) {
      return { notes: [], total: 0, page, limit }
    }

    let targetUserId = BigInt(user.id)
    let isOwnedByViewer = true

    if (partnerId) {
      // Find partner link
      const link = await prisma.partnerLink.findFirst({
        where: {
          OR: [
            { userAId: BigInt(user.id), userBId: BigInt(partnerId) },
            { userAId: BigInt(partnerId), userBId: BigInt(user.id) },
          ],
        },
      })

      if (!link || !link.acceptedAt) {
        throw Errors.partnerLinkAccessDenied().toH3Error()
      }

      const side = getPartnerSide(link as PartnerLinkRecord, user.id)

      if (!side.partnerSharesStockNotes) {
        throw Errors.forbidden('Partner has not enabled stock notes sharing').toH3Error()
      }

      targetUserId = BigInt(side.partner.id)
      isOwnedByViewer = false
    }

    const result = await listStockNotes(targetUserId, BigInt(stock.id), { page, limit, createdVia })
    return {
      notes: result.notes.map((n: Parameters<typeof toStockNoteResponse>[0]) => ({
        ...toStockNoteResponse(n),
        isOwnedByViewer,
      })),
      total: result.total,
      page: result.page,
      limit: result.limit,
    }
  } catch (error) {
    handleApiError(error, log)
  }
})
