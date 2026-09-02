import { handleApiError } from '~/server/utils/error-handler'
import { logger } from '~/lib/logger'
import { requireApiKey } from '~/server/utils/api-key'
import { createStockTimelineRecordsFromAgent } from '~/server/utils/stock-timeline-queries'
import { serialize } from '~/server/utils/serialize'
import { agentTimelineBatchRequestSchema } from '~/lib/contracts/stocks'

export default defineEventHandler(async (event) => {
  const log = logger.stocks.withRequestId(event.context.requestId)

  try {
    const auth = await requireApiKey(event, ['AGENT_WRITE'])
    const body = await readBody(event)
    const payload = agentTimelineBatchRequestSchema.parse(body)

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

    return serialize(result)
  } catch (error) {
    handleApiError(error, log)
  }
})
