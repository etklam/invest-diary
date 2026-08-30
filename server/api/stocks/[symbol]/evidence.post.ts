import { z } from 'zod'
import { logger } from '~/lib/logger'
import { requireUser } from '~/server/utils/auth'
import { createStockTimelineRecordFromWeb, toTimelineResponseItem } from '~/server/utils/stock-timeline-queries'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'
import { Errors } from '~/lib/errors/factory'
import { handleApiError } from '~/server/utils/error-handler'
import { stockTimelineSourceTypeSchema } from '~/lib/stocks/timeline-source'

const SYMBOL_REGEX = /^[A-Za-z0-9.]{1,10}$/

const requestSchema = z.object({
  summary: z.string().min(1).max(10000),
  sourceType: stockTimelineSourceTypeSchema,
  sourceTitle: z.string().max(255).optional(),
  sourceUrl: z.string().url().max(1000)
    .refine(value => value.startsWith('http://') || value.startsWith('https://'), {
      message: 'sourceUrl must be an http(s) URL',
    })
    .optional(),
  occurredAt: z.string().datetime(),
  idempotencyKey: z.string().min(1).max(128).optional(),
  metadataJson: z.string().optional(),
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)
  const user = requireUser(event)

  try {
    const rawSymbol = decodeURIComponent(String(event.context.params?.symbol))
    if (!SYMBOL_REGEX.test(rawSymbol)) {
      throw Errors.validationError([{ field: 'symbol', message: 'Invalid stock symbol format' }]).toH3Error()
    }
    const symbol = normalizeStockSymbol(rawSymbol)

    const body = await readBody(event)
    const payload = requestSchema.parse(body)

    const record = await createStockTimelineRecordFromWeb(user.id, symbol, payload)

    return toTimelineResponseItem(record)
  } catch (error) {
    handleApiError(error, log)
  }
})
