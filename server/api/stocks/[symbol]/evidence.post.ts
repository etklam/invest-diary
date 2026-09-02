import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { createStockTimelineRecordFromWeb, toTimelineResponseItem } from '~/server/utils/stock-timeline-queries'
import { normalizeStockSymbol, parseSymbolParam } from '~/lib/stocks/symbols'
import { handleApiError } from '~/server/utils/error-handler'
import { stockSymbolSchema, webEvidenceRequestSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const rawSymbol = parseSymbolParam(event)
    const symbol = normalizeStockSymbol(stockSymbolSchema.parse(rawSymbol))

    const body = await readBody(event)
    const payload = webEvidenceRequestSchema.parse(body)

    const record = await createStockTimelineRecordFromWeb(user.id, symbol, {
      ...payload,
      sourceTitle: payload.sourceTitle ?? undefined,
      sourceUrl: payload.sourceUrl ?? undefined,
    })

    return toTimelineResponseItem(record)
  } catch (error) {
    handleApiError(error, log)
  }
})
