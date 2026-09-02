import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { createStockNote, requestSchema, toStockNoteResponse } from '~/lib/stocks/notes'
import { normalizeStockSymbol, parseSymbolParam } from '~/lib/stocks/symbols'
import { handleApiError } from '~/server/utils/error-handler'
import type { StockNoteResponse } from '~/types/stock-note'
import { stockSymbolSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event): Promise<StockNoteResponse> => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const rawSymbol = parseSymbolParam(event)
    const symbol = normalizeStockSymbol(stockSymbolSchema.parse(rawSymbol))

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

    return toStockNoteResponse(note)
  } catch (error) {
    handleApiError(error, log)
  }
})
