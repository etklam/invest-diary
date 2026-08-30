import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { createStockNote, requestSchema, toStockNoteResponse } from '~/lib/stocks/notes'
import { normalizeStockSymbol, parseSymbolParam, symbolSchema } from '~/lib/stocks/symbols'
import { handleApiError } from '~/server/utils/error-handler'
import { serialize } from '~/server/utils/serialize'
import type { StockNoteResponse } from '~/types/stock-note'

export default defineEventHandler(async (event): Promise<StockNoteResponse> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const rawSymbol = parseSymbolParam(event)
    const symbol = normalizeStockSymbol(symbolSchema.parse(rawSymbol))

    const body = await readBody(event)
    const payload = requestSchema.parse(body)

    const note = await createStockNote(BigInt(user.id), {
      symbol,
      title: payload.title,
      content: payload.content,
      date: payload.date,
      createdVia: 'USER',
      createdByLabel: undefined,
    })

    return serialize(toStockNoteResponse(note))
  } catch (error) {
    handleApiError(error, log)
  }
})
