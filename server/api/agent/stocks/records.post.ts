import { z } from 'zod'
import { AppError, Errors } from '~/lib/errors/factory'
import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { createStockTimelineRecordsFromAgent } from '~/server/utils/stock-timeline-records'
import { normalizeStockSymbol } from '~/lib/stocks/symbols'

const timelineRecordSchema = z.object({
  symbol: z.string().min(1).max(32).transform(normalizeStockSymbol),
  summary: z.string().min(1),
  sourceType: z.enum(['TRADE_BASIC_DIARY', 'VIDEO_TRANSCRIBE_SUMMARIZE', 'DIARY', 'ARTICLE', 'MANUAL', 'SYSTEM']),
  sourceTitle: z.string().max(255).optional(),
  sourceUrl: z.string().url().max(1000).optional(),
  sourceDiaryId: z.string().regex(/^[1-9]\d*$/).optional(),
  sourceExternalId: z.string().max(255).optional(),
  sourceExcerpt: z.string().optional(),
  confidence: z.number().int().min(0).max(100).optional(),
  idempotencyKey: z.string().min(1).max(128),
  occurredAt: z.string().datetime(),
  metadataJson: z.string().optional(),
})

const requestSchema = z.object({
  records: z.array(timelineRecordSchema).min(1).max(100),
})

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, ['AGENT_WRITE'])
    const body = await readBody(event)
    const payload = requestSchema.parse(body)

    const result = await createStockTimelineRecordsFromAgent({
      userId: auth.user.id,
      createdByLabel: auth.label,
      records: payload.records,
    })

    log.info('Stock timeline records processed via API key', {
      userId: auth.user.id,
      apiKeyId: auth.apiKeyId,
      createdCount: result.created.length,
      updatedCount: result.updated.length,
      skippedCount: result.skipped.length,
    })

    return result
  } catch (error) {
    if (error instanceof AppError) {
      log.warn(error.message, { code: error.code })
      throw error.toH3Error()
    }
    if (error instanceof z.ZodError) {
      throw Errors.validationError(error.issues.map((issue) => ({
        field: issue.path.join('.'),
        message: issue.message,
      }))).toH3Error()
    }
    log.error('Failed to write stock timeline records via API key', { error: String(error) })
    throw Errors.internalError(error).toH3Error()
  }
})
